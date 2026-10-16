// Carnet de dégustation : API (comptes + journal privé) sur Cloudflare Workers + D1.
// Les fichiers du site (dossier public/) sont servis par Workers Static Assets ;
// seules les requêtes /api/* arrivent ici (voir wrangler.jsonc, run_worker_first).

const ENC = new TextEncoder();
const PBKDF2_ITER = 100000; // maximum accepté par WebCrypto sur Workers
const SESSION_DAYS = 30;
const COOKIE = 'carnet_session';
const MAX_ENTRIES = 3000; // vins par compte
const MAX_BODY = 2000000; // octets, pour un import en lot
const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;
const USER_RE = /^[a-z0-9][a-z0-9_.-]{2,23}$/;

// Champs d'une fiche de dégustation (identiques à ceux du site).
const FIELD_KEYS = ['kind', 'aveugle', 'tex', 'fnat', 'exp', 'date', 'deg', 'nom', 'prod', 'app', 'cep', 'mil', 'prix', 'abv', 'type', 'eff', 'limp', 'icol', 'col',
  'aobs', 'cond', 'inez', 'anez', 'dev', 'suc', 'aci', 'tan', 'ttan', 'alc', 'corps', 'mousse', 'iboc', 'aboc', 'fin',
  'bobs', 'bal', 'lon', 'int', 'cpx', 'qual', 'jqual', 'mat', 'com', 'acc', 'fav'];
const LONG_KEYS = new Set(['tex', 'aobs', 'anez', 'aboc', 'bobs', 'jqual', 'com', 'acc']);

/* Le mode « spiritueux » est ouvert à tous les comptes. Pour le réserver à certains comptes, définir SPIRITS_USERS
   (identifiants séparés par des virgules) ; la valeur * ou l'absence de variable ouvre à tout le monde. */
function spiritsAllowed(env, username) {
  const raw = String(env.SPIRITS_USERS || '').toLowerCase().trim();
  if (!raw || raw === '*') return true;
  return raw.split(',').map((x) => x.trim()).filter(Boolean).includes(String(username || '').toLowerCase());
}
const publicUser = (env, username) => ({ username, spirits: spiritsAllowed(env, username) });

class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

/* ---------- utilitaires ---------- */
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const randomToken = (n = 32) => b64u(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async (s) => b64u(await crypto.subtle.digest('SHA-256', ENC.encode(s)));

function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function hashPassword(password, saltB64, iterations) {
  const key = await crypto.subtle.importKey('raw', ENC.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64u(saltB64), iterations }, key, 256);
  return b64u(bits);
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

function sessionCookie(value, maxAge, secure) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

async function readJson(request) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) throw new HttpError(415, 'Requête invalide.');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'Envoi trop volumineux.');
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') throw 0;
    return data;
  } catch (e) {
    throw new HttpError(400, 'Requête invalide.');
  }
}

/* ---------- base de données ---------- */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
     pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, pw_iter INTEGER NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS entries (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, id TEXT NOT NULL,
     date TEXT, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
     PRIMARY KEY (user_id, id))`,
  `CREATE INDEX IF NOT EXISTS entries_user_date ON entries(user_id, date)`,
  `CREATE TABLE IF NOT EXISTS attempts (key TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS attempts_key ON attempts(key, ts)`,
];
let schemaReady = null;
function ensureSchema(env) {
  // Crée les tables au premier appel (sans effet si elles existent déjà).
  if (!schemaReady) {
    schemaReady = env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql))).catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

/* ---------- limitation des essais ---------- */
async function tooMany(env, key, max, windowSec) {
  const since = Math.floor(Date.now() / 1000) - windowSec;
  const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM attempts WHERE key = ? AND ts > ?').bind(key, since).first();
  return (row ? row.c : 0) >= max;
}
async function noteAttempt(env, key) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO attempts (key, ts) VALUES (?, ?)').bind(key, now),
    env.DB.prepare('DELETE FROM attempts WHERE ts < ?').bind(now - 86400),
  ]);
}
const clientIp = (request) => request.headers.get('CF-Connecting-IP') || 'inconnue';

/* ---------- sessions ---------- */
async function startSession(env, request, userId) {
  const token = randomToken(32);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256(token), userId, now + SESSION_DAYS * 86400, now),
  ]);
  const secure = new URL(request.url).protocol === 'https:';
  return sessionCookie(token, SESSION_DAYS * 86400, secure);
}

async function currentUser(env, request) {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    'SELECT u.id AS id, u.username AS username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'
  ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row ? { id: row.id, username: row.username, tokenHash } : null;
}

async function requireUser(env, request) {
  const user = await currentUser(env, request);
  if (!user) throw new HttpError(401, 'Connecte-toi pour continuer.', { inviteRequired: !!env.INVITE_CODE });
  return user;
}

/* ---------- comptes ---------- */
function checkCredentials(username, password) {
  if (!USER_RE.test(username)) {
    throw new HttpError(400, 'Identifiant : 3 à 24 caractères (lettres minuscules, chiffres, point, tiret, tiret bas), en commençant par une lettre ou un chiffre.');
  }
  checkPassword(password);
}
function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    throw new HttpError(400, 'Le mot de passe doit contenir entre 8 et 200 caractères.');
  }
}

async function register(env, request) {
  const body = await readJson(request);
  const username = String(body.username || '').trim().toLowerCase();
  const password = body.password;
  const ip = 'reg:' + clientIp(request);
  if (await tooMany(env, ip, 20, 3600)) throw new HttpError(429, 'Trop de créations de compte. Réessaie plus tard.');
  await noteAttempt(env, ip);
  if (env.INVITE_CODE && !safeEqual(String(body.invite || '').trim(), env.INVITE_CODE)) {
    throw new HttpError(403, 'Code d’invitation incorrect.');
  }
  checkCredentials(username, password);
  const id = randomToken(12);
  const salt = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt, PBKDF2_ITER);
  try {
    await env.DB.prepare('INSERT INTO users (id, username, pw_hash, pw_salt, pw_iter, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, username, hash, salt, PBKDF2_ITER, new Date().toISOString()).run();
  } catch (e) {
    if (String(e && e.message).includes('UNIQUE')) throw new HttpError(409, 'Cet identifiant est déjà pris.');
    throw e;
  }
  const cookie = await startSession(env, request, id);
  return json({ user: publicUser(env, username) }, 201, { 'Set-Cookie': cookie });
}

async function login(env, request) {
  const body = await readJson(request);
  const username = String(body.username || '').trim().toLowerCase();
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  const kUser = 'u:' + username, kIp = 'ip:' + clientIp(request);
  if ((await tooMany(env, kUser, 8, 900)) || (await tooMany(env, kIp, 30, 900))) {
    throw new HttpError(429, 'Trop d’essais. Réessaie dans quelques minutes.');
  }
  const row = USER_RE.test(username)
    ? await env.DB.prepare('SELECT id, pw_hash, pw_salt, pw_iter FROM users WHERE username = ?').bind(username).first()
    : null;
  // Même durée de calcul que l'identifiant existe ou non.
  const salt = row ? row.pw_salt : 'AAAAAAAAAAAAAAAAAAAAAA';
  const hash = await hashPassword(password, salt, row ? row.pw_iter : PBKDF2_ITER);
  if (!row || !safeEqual(hash, row.pw_hash)) {
    await Promise.all([noteAttempt(env, kUser), noteAttempt(env, kIp)]);
    throw new HttpError(401, 'Identifiant ou mot de passe incorrect.', { inviteRequired: !!env.INVITE_CODE });
  }
  await env.DB.prepare('DELETE FROM attempts WHERE key = ?').bind(kUser).run();
  const cookie = await startSession(env, request, row.id);
  return json({ user: publicUser(env, username) }, 200, { 'Set-Cookie': cookie });
}

async function logout(env, request) {
  const user = await currentUser(env, request);
  if (user) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user.tokenHash).run();
  const secure = new URL(request.url).protocol === 'https:';
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0, secure) });
}

async function verifyPassword(env, userId, password) {
  const row = await env.DB.prepare('SELECT pw_hash, pw_salt, pw_iter FROM users WHERE id = ?').bind(userId).first();
  if (!row || typeof password !== 'string') return false;
  return safeEqual(await hashPassword(password.slice(0, 200), row.pw_salt, row.pw_iter), row.pw_hash);
}

async function changePassword(env, request) {
  const user = await requireUser(env, request);
  const body = await readJson(request);
  if (await tooMany(env, 'pw:' + user.id, 8, 900)) throw new HttpError(429, 'Trop d’essais. Réessaie dans quelques minutes.');
  if (!(await verifyPassword(env, user.id, body.current))) {
    await noteAttempt(env, 'pw:' + user.id);
    throw new HttpError(403, 'Le mot de passe actuel est incorrect.');
  }
  checkPassword(body.next);
  const salt = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(body.next, salt, PBKDF2_ITER);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ? WHERE id = ?').bind(hash, salt, PBKDF2_ITER, user.id),
    // les autres appareils doivent se reconnecter
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, user.tokenHash),
  ]);
  return json({ ok: true });
}

async function deleteAccount(env, request) {
  const user = await requireUser(env, request);
  const body = await readJson(request);
  if (await tooMany(env, 'pw:' + user.id, 8, 900)) throw new HttpError(429, 'Trop d’essais. Réessaie dans quelques minutes.');
  if (!(await verifyPassword(env, user.id, body.password))) {
    await noteAttempt(env, 'pw:' + user.id);
    throw new HttpError(403, 'Le mot de passe est incorrect.');
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM entries WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  const secure = new URL(request.url).protocol === 'https:';
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0, secure) });
}

/* ---------- journal ---------- */
function cleanEntry(body, env, user) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Fiche invalide.');
  const out = {};
  for (const k of FIELD_KEYS) {
    let v = body[k];
    if (typeof v === 'number') v = String(v);
    if (typeof v !== 'string') continue;
    v = v.trim();
    if (!v) continue;
    out[k] = v.slice(0, LONG_KEYS.has(k) ? 4000 : 300);
  }
  if (out.aveugle !== 'Oui') delete out.aveugle;
  if (out.fav !== 'Oui') delete out.fav;
  if (out.kind !== 'spi') delete out.kind;
  else if (!spiritsAllowed(env, user.username)) throw new HttpError(403, 'Les spiritueux ne sont pas encore ouverts pour ce compte.');
  if (!Object.keys(out).length) throw new HttpError(400, 'La fiche est vide.');
  if (out.date && !/^\d{4}-\d{2}-\d{2}$/.test(out.date)) delete out.date;
  return out;
}

function rowToEntry(r) {
  let data = {};
  try { data = JSON.parse(r.data); } catch (e) { /* ligne illisible : fiche vide */ }
  return { ...data, id: r.id, createdAt: r.created_at, updatedAt: r.updated_at };
}

function upsertStatement(env, userId, id, clean, now) {
  return env.DB.prepare(
    `INSERT INTO entries (user_id, id, date, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, id) DO UPDATE SET date = excluded.date, data = excluded.data, updated_at = excluded.updated_at`
  ).bind(userId, id, clean.date || null, JSON.stringify(clean), now, now);
}

async function countEntries(env, userId) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM entries WHERE user_id = ?').bind(userId).first();
  return row ? row.c : 0;
}

async function listEntries(env, request) {
  const user = await requireUser(env, request);
  const { results } = await env.DB.prepare(
    'SELECT id, data, created_at, updated_at FROM entries WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5000'
  ).bind(user.id).all();
  return json({ entries: results.map(rowToEntry) });
}

async function putEntry(env, request, rawId) {
  const user = await requireUser(env, request);
  const id = decodeURIComponent(rawId);
  if (!ID_RE.test(id)) throw new HttpError(400, 'Identifiant de fiche invalide.');
  const clean = cleanEntry(await readJson(request), env, user);
  const exists = await env.DB.prepare('SELECT 1 AS x FROM entries WHERE user_id = ? AND id = ?').bind(user.id, id).first();
  if (!exists && (await countEntries(env, user.id)) >= MAX_ENTRIES) throw new HttpError(413, 'Le journal est plein (' + MAX_ENTRIES + ' vins).');
  const now = new Date().toISOString();
  await upsertStatement(env, user.id, id, clean, now).run();
  const row = await env.DB.prepare('SELECT id, data, created_at, updated_at FROM entries WHERE user_id = ? AND id = ?').bind(user.id, id).first();
  return json({ entry: rowToEntry(row) });
}

async function deleteEntry(env, request, rawId) {
  const user = await requireUser(env, request);
  const id = decodeURIComponent(rawId);
  if (!ID_RE.test(id)) throw new HttpError(400, 'Identifiant de fiche invalide.');
  await env.DB.prepare('DELETE FROM entries WHERE user_id = ? AND id = ?').bind(user.id, id).run();
  return json({ ok: true });
}

async function bulkEntries(env, request) {
  const user = await requireUser(env, request);
  const body = await readJson(request);
  const list = Array.isArray(body.entries) ? body.entries : null;
  if (!list || !list.length) throw new HttpError(400, 'Aucune fiche à enregistrer.');
  if (list.length > 300) throw new HttpError(413, 'Trop de fiches en une fois (300 maximum).');
  if ((await countEntries(env, user.id)) + list.length > MAX_ENTRIES) throw new HttpError(413, 'Le journal est plein (' + MAX_ENTRIES + ' vins).');
  const now = new Date().toISOString();
  const ids = [], stmts = [];
  for (const item of list) {
    const clean = cleanEntry(item, env, user);
    const id = item && typeof item.id === 'string' && ID_RE.test(item.id) ? item.id : 'v' + randomToken(9);
    ids.push(id);
    stmts.push(upsertStatement(env, user.id, id, clean, now));
  }
  await env.DB.batch(stmts);
  const placeholders = ids.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT id, data, created_at, updated_at FROM entries WHERE user_id = ? AND id IN (${placeholders})`
  ).bind(user.id, ...ids).all();
  return json({ entries: results.map(rowToEntry) });
}

/* ---------- routage ---------- */
function checkOrigin(request) {
  const m = request.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return;
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Requête refusée.');
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;
  checkOrigin(request);
  await ensureSchema(env);

  if (path === '/api/me') {
    if (method === 'GET') {
      const user = await requireUser(env, request);
      return json({ user: publicUser(env, user.username) });
    }
    if (method === 'DELETE') return deleteAccount(env, request);
  }
  if (path === '/api/register' && method === 'POST') return register(env, request);
  if (path === '/api/login' && method === 'POST') return login(env, request);
  if (path === '/api/logout' && method === 'POST') return logout(env, request);
  if (path === '/api/password' && method === 'POST') return changePassword(env, request);
  if (path === '/api/journal') {
    if (method === 'GET') return listEntries(env, request);
    if (method === 'POST') return bulkEntries(env, request);
  }
  const m = /^\/api\/journal\/([^/]+)$/.exec(path);
  if (m) {
    if (method === 'PUT') return putEntry(env, request, m[1]);
    if (method === 'DELETE') return deleteEntry(env, request, m[1]);
  }
  throw new HttpError(404, 'Introuvable.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await route(request, env);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...(e.extra || {}) }, e.status);
      console.error('Erreur serveur :', e && e.stack ? e.stack : e);
      return json({ error: 'Erreur du serveur. Réessaie dans un instant.' }, 500);
    }
  },
};
