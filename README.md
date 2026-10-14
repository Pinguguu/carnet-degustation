# Carnet de dégustation (WSET SAT)

Site de dégustation avec comptes (identifiant + mot de passe) : fiche en quatre étapes selon l'approche systématique du WSET, journal privé par personne, 33 cépages, fiche spiritueux (WSET) avec ses catégories, lexique d'arômes, export et import Excel, fiche PDF par vin.

Hébergé sur **Cloudflare Workers** (le site et l'API) avec une base **D1** (SQLite). Pas de framework : du HTML, du CSS et du JavaScript simples.

## Déployer (environ 15 minutes)

Les libellés du tableau de bord Cloudflare changent de temps en temps ; l'idée reste la même.

### 1. Créer la base D1

1. Dans Cloudflare : **Storage & databases**, **D1 SQL database**, **Create database**.
2. Nom : `carnet-degustation`.
3. Copie son **Database ID**.
4. Dans `wrangler.jsonc`, remplace `COLLE-ICI-L-IDENTIFIANT-DE-LA-BASE-D1` par cet identifiant, puis enregistre la modification sur GitHub (commit sur la branche `main`).

Les tables (comptes, sessions, vins) se créent toutes seules à la première requête : il n'y a rien d'autre à configurer côté base.

### 2. Relier GitHub à Cloudflare

1. **Workers & Pages**, **Create application**, **Import a repository**.
2. Choisis le dépôt `carnet-degustation`.
3. Le **nom du Worker doit être exactement `carnet-degustation`** (c'est le `name` de `wrangler.jsonc`), sinon le déploiement échoue.
4. Commande de build : laisse vide. Si une commande de déploiement est demandée : `npx wrangler deploy`.
5. **Save and Deploy**. Ensuite, chaque modification poussée sur `main` redéploie le site.

### 3. Mettre un code d'invitation (fortement conseillé)

Dans le Worker : **Settings**, **Variables and Secrets**, **Add** :

- Type : **Secret** (pas « Text »)
- Nom : `INVITE_CODE`
- Valeur : le code que tu donnes à tes amis

Sans ce secret, toute personne qui connaît l'adresse du site peut créer un compte. Pour fermer les inscriptions, change le code.

### 4. Spiritueux (réservés pendant les tests)

Le site contient aussi la fiche spiritueux. Tant que le secret ci-dessous n'existe pas, personne ne la voit, et le serveur refuse les fiches spiritueux.

Dans le Worker : **Settings**, **Variables and Secrets**, **Add** :

- Nom : `SPIRITS_USERS`
- Valeur : les identifiants autorisés, séparés par des virgules (par exemple `pingugu,noe`). Mets `*` pour ouvrir à tout le monde.

Les comptes autorisés voient un sélecteur **Vins / Spiritueux** sous le titre. Chaque journal reste séparé.

### 5. Partager

Ouvre `https://carnet-degustation.<ton-sous-domaine>.workers.dev`, crée ton compte, puis envoie l'adresse et le code d'invitation à tes amis. Chacun a son journal, que les autres ne voient pas.

### Variante en ligne de commande

```
npm install
npx wrangler login
npx wrangler d1 create carnet-degustation     # affiche le database_id à copier dans wrangler.jsonc
npx wrangler secret put INVITE_CODE
npx wrangler deploy
```

## Mot de passe oublié

Il n'y a pas d'e-mail, donc pas de récupération automatique. La personne qui gère le site peut réinitialiser un mot de passe :

1. Ouvre `/outils/reset` sur le site.
2. Saisis l'identifiant et un nouveau mot de passe : la page fabrique une requête SQL. Le mot de passe reste dans ton navigateur, seule son empreinte apparaît.
3. Cloudflare, **D1**, `carnet-degustation`, onglet **Console** : colle la requête et exécute-la.
4. Donne le nouveau mot de passe à l'ami, qui peut le changer dans l'onglet **Compte**.

La requête ferme aussi ses sessions ouvertes et lève un éventuel blocage après trop d'essais.

## Développement local

```
npm install
echo "INVITE_CODE=amis2026" > .dev.vars     # facultatif, jamais versionné
npm run dev                                 # http://localhost:8787
```

La base D1 locale est créée dans `.wrangler/` (ignoré par git) ; la valeur d'exemple de `database_id` suffit en local. Pour exécuter une requête sur la base locale :

```
npx wrangler d1 execute carnet-degustation --local --command "SELECT username FROM users"
```

## Modifier le contenu

- Cépages : `public/cepages.js` (un bloc par cépage).
- Lexique d'arômes, échelles de la fiche, champs : début de `public/app.js`.
- Apparence : `public/style.css`.

## Sécurité (résumé)

- Mots de passe : PBKDF2-SHA256, 100 000 itérations, sel aléatoire. Seule l'empreinte est stockée.
- Sessions : jeton aléatoire de 30 jours, seul son hachage est stocké ; cookie `HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS. Le changement de mot de passe ferme les autres sessions.
- Limitation des essais : 8 échecs par identifiant et par 15 minutes (30 par adresse IP), 20 créations de compte par heure et par adresse IP.
- Vérification de l'en-tête `Origin` sur les requêtes qui modifient des données.
- Politique de sécurité du contenu (CSP) et autres en-têtes dans `public/_headers`.
- Chaque requête sur le journal est limitée au compte connecté.

À savoir : la personne qui héberge le site a accès à la base de données, donc aux journaux. Chaque compte est limité à 3 000 vins.

## Fichiers

```
src/index.js          API : comptes, sessions, journal (Workers + D1)
public/index.html     page unique (connexion, fiche, journal, cépages, lexique, compte)
public/app.js         logique du site
public/style.css      styles
public/cepages.js     données des cépages
public/spiritueux.js  catégories de spiritueux
public/_headers       en-têtes de sécurité
public/outils/        outil de réinitialisation de mot de passe
public/vendor/        ExcelJS et jsPDF (licence MIT), chargés à la demande
wrangler.jsonc        configuration Cloudflare
```
