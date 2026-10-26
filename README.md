# Carnet de dégustation (WSET SAT)

Site de dégustation avec comptes (identifiant, e-mail et mot de passe, récupération du mot de passe par e-mail), photo de l'étiquette : fiche en quatre étapes selon l'approche systématique du WSET, journal privé par personne, 33 cépages, fiche spiritueux (WSET) avec ses catégories, lexique d'arômes, export et import Excel, fiche PDF par vin.

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

### 4. E-mails de récupération du mot de passe

Les comptes ont une adresse e-mail (obligatoire à l'inscription). En cas d'oubli, le lien **Mot de passe oublié ?** de l'écran de connexion envoie un lien valable une heure, qui ne sert qu'une fois. L'envoi passe par **Cloudflare Email Service**.

Prérequis :

- un **nom de domaine géré par Cloudflare** (par exemple `mondomaine.fr`) ;
- le forfait **Workers Paid** (5 $/mois, 3 000 e-mails inclus) : sur le forfait gratuit, Cloudflare n'envoie qu'aux adresses que tu as vérifiées toi-même, donc pas à tes amis.

Étapes :

1. Dans Cloudflare, **Email Service**, **Email Sending** : ajoute ton domaine et laisse Cloudflare créer les enregistrements DNS (SPF, DKIM).
2. Dans `wrangler.jsonc` : retire les `//` devant la ligne `"send_email": [{ "name": "EMAIL" }],` et mets l'adresse d'expédition dans `MAIL_FROM` (par exemple `"carnet@mondomaine.fr"`), puis enregistre sur GitHub (commit sur `main`). Ne décommente pas la ligne `send_email` avant l'étape 1 : Cloudflare refuserait le déploiement.
3. Teste depuis l'écran de connexion avec ton propre compte. En cas de souci, les erreurs d'envoi apparaissent dans les journaux du Worker (**Observability**).

Tant que `send_email` est en commentaire ou que `MAIL_FROM` est vide, le lien répond que la récupération n'est pas configurée et l'outil manuel ci-dessous reste disponible.

Les comptes créés avant l'arrivée des e-mails n'ont pas d'adresse : un message leur demande d'en ajouter une dans l'onglet **Compte**.

### 5. Photos d'étiquette

Chaque fiche (vin ou spiritueux) peut avoir une photo de l'étiquette : vignette dans le journal, photo en grand dans le détail, et dans la fiche PDF. Le site réduit la photo avant l'envoi (1 200 px, environ 150 à 300 Ko). Les photos sont rangées dans **Cloudflare R2** (offre gratuite : 10 Go).

1. Cloudflare, **R2 Object Storage** : active R2 (Cloudflare peut demander un moyen de paiement, même pour l'offre gratuite).
2. **Create bucket**, nom : `carnet-photos` (emplacement automatique, classe Standard). Ne le rends pas public : le site sert lui-même les photos, seulement à leur propriétaire.
3. Dans `wrangler.jsonc`, retire les `//` devant la ligne `"r2_buckets": …`, puis enregistre sur GitHub (commit sur `main`). Ne le fais pas avant l'étape 2 : Cloudflare refuserait le déploiement.

Tant que la ligne est en commentaire, le champ photo n'apparaît pas.

### 6. Spiritueux

Le site contient aussi la fiche spiritueux, ouverte à tous les comptes : un sélecteur **Vins / Spiritueux** apparaît sous le titre.

Pour la réserver à certains comptes (par exemple pendant des tests), ajoute dans le Worker, **Settings**, **Variables and Secrets** :

- Nom : `SPIRITS_USERS`
- Valeur : les identifiants autorisés, séparés par des virgules (par exemple `pingugu,noe`).

Supprime ce secret (ou mets `*`) pour rouvrir à tout le monde. Le serveur refuse les fiches spiritueux des autres comptes.

### 7. Partager

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

Normalement, chacun passe par **Mot de passe oublié ?** sur l'écran de connexion (voir l'étape 4). Si l'envoi d'e-mails n'est pas configuré, ou si l'ami n'a pas renseigné d'adresse, la personne qui gère le site peut réinitialiser un mot de passe à la main :

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

La base D1 locale est créée dans `.wrangler/` (ignoré par git) ; la valeur d'exemple de `database_id` suffit en local. Pour essayer la récupération du mot de passe, ajoute `MAIL_FROM=carnet@example.com` dans `.dev.vars` : en local, les e-mails ne partent pas, leur contenu (avec le lien) est enregistré dans `.wrangler/tmp/email/` et signalé dans le terminal. Pour exécuter une requête sur la base locale :

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
- Récupération du mot de passe : jeton aléatoire valable une heure et à usage unique, seul son hachage est stocké. Le lien porte le jeton après `#`, donc il n'apparaît pas dans les journaux du serveur. La réponse est la même que le compte existe ou non. Au plus 3 e-mails par compte et 10 demandes par adresse IP, par heure. Une réinitialisation ferme toutes les sessions ; changer d'adresse ou de mot de passe annule les liens en cours.
- Photos : rangées sous l'identifiant du compte, servies uniquement au compte connecté qui les a ajoutées ; JPEG uniquement, 1,5 Mo au plus. Supprimer une fiche ou un compte supprime ses photos.
- Changer d'adresse e-mail demande le mot de passe. L'adresse n'est pas vérifiée à l'inscription : une adresse erronée empêche seulement la récupération.
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
