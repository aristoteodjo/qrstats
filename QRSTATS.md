# QRSTATS.md

Mémoire des agents et document d'architecture vivant. Le lire avant toute modification, le tenir à jour quand une décision est prise ou qu'un invariant change. Les guides de `docs/` le détaillent ; en cas de conflit, ce fichier gagne.

## Projet

**qrstats** : des QR codes dont on change la destination après impression, avec le suivi de chaque scan.

- Principe directeur : **le code imprimé n'encode jamais la destination, seulement `/r/<slug>`.** Le slug ne change jamais ; tout le reste (destination, type, apparence, mot de passe, statut) se modifie sans réimprimer.
- Exception : le Wi-Fi est **statique** (le réseau est dans le motif, sinon l'appareil photo ne le rejoint pas). Ni modifiable en type, ni mis en pause, ni protégé, ni comptabilisé.
- Langue de l'interface : français.

## Utilisateurs et espaces

Un seul hôte pour le web (décision du 2026-11-18, remplace les espaces `site` / `app.`) : le site public (`/`, pages légales, `/connexion`, `/inscription`, page de scan `/q/<slug>`) et l'espace connecté (`/analyses`, `/qr-codes`, `/compte`, `/aide`, layout `_app`, `ssr: false`) partagent le même domaine. L'API Go est sur son propre hôte (`VITE_SHORT_URL`) : `/r/<slug>` (redirection + comptage) et `/api/v1`.

En dev : `localhost:3110` (web, écoute IPv4 et IPv6), `localhost:8110` (API).

Comptes personnels : chaque utilisateur possède ses codes (`qr_codes.owner_subject` = `sub` du JWT). Pas d'organisation ni de rôle pour l'instant.

## Authentification

Better Auth dans `web/` (email + mot de passe, tables dans le schéma Postgres `better_auth`, créé par la migration de l'API ; tables créées par `POST /api/maintenance/auth-migrate` avec `MAINTENANCE_SECRET`). Le plugin `jwt` émet un jeton EdDSA de 15 min (audience `qrstats-api`) ; l'API le vérifie avec le JWKS `/api/auth/jwks` (`internal/platform/jwks`). Jeton gardé en mémoire côté navigateur, session en cookie httpOnly. Pages `/connexion` et `/inscription` (TanStack Form : validation au blur et à la soumission, règles dans `lib/auth-forms.ts`, codes d'erreur Better Auth traduits).

## Barre de qualité

Prêt pour la production, ou ça ne part pas.

- **Exactitude** : un bot ou un aperçu de messagerie n'est jamais un scan ; un jour se lit dans le fuseau du lecteur (`tz`) ; une série n'a jamais de trou (`FillSeries`).
- **Sécurité** : isolation stricte par propriétaire (un code d'un autre répond 404, comme un code inexistant). Destinations http(s) uniquement. Slugs tirés de `crypto/rand`. Mot de passe de code : 6 à 72 caractères, bcrypt ; essais bornés deux fois : 10 par IP et slug (mémoire de l'instance) et **30 échecs par code sur 15 min, toutes IP confondues, compteur partagé en base**, essai réservé atomiquement (`UPDATE ... RETURNING`) avant bcrypt et rendu si le mot de passe est bon (`qr_codes.unlock_failures`). Prix accepté : un attaquant peut bloquer un code protégé pour ses visiteurs pendant 15 min. IP client lue dans **un seul** en-tête, celui que l'edge réécrit (`CLIENT_IP_HEADER`, défaut `X-Vercel-Forwarded-For`), et seulement si `TRUST_PROXY_HEADERS=true` ; tout autre en-tête de transfert est ignoré.
- **Vie privée** : aucune IP stockée. Visiteur unique = HMAC(`VISITOR_SECRET`, jour UTC | IP | UA), qui change chaque jour. « Uniques » sur une période = somme des uniques par jour.
- **Performance** : `/r/<slug>` fait une lecture par slug (index unique) et une écriture, `Cache-Control: no-store`. Statistiques agrégées en SQL, index `(qr_code_id, at)`.
- **Architecture** : métier dans des fonctions pures (`api/internal/service/*.go` hors `qrcodes.go`/`scans.go` qui orchestrent ; `web/src/lib/*.ts`). Handlers et composants minces.
- **UI/UX** : chaque état conçu (chargement, vide, erreur, pause, protégé, introuvable).

Vérifier avant de dire fini (via `portly temp` / `portly wait`) :
- web : `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build`
- api : `gofmt -l .`, `go vet ./...`, `TEST_DATABASE_URL=... go test ./...`

Un changement sur un sous-système critique exige un test qui verrouille l'invariant : **redirection et précédence UTM (`target.go`), détection des bots et du client (`useragent.go`), hash visiteur (`visitor.go`), plages et séries (`stats.go`), isolation par propriétaire (`qrcodes_test.go`, `store_test.go`), agrégats SQL (`store_test.go`), payload Wi-Fi et vCard (`web/src/lib/qr.ts`).**

## Domaine et règles métier

### Types de QR code
`url`, `text`, `vcard`, `email`, `phone`, `sms` (dynamiques) et `wifi` (statique). Contenu validé et normalisé par `service.NormalizeContent` (miroir côté web : `lib/qr-rules.ts`). Un type dynamique peut devenir un autre type dynamique ; jamais vers ou depuis Wi-Fi.

### Redirection `/r/<slug>`
Lien actif sans mot de passe : scan enregistré puis 302 vers la destination avec UTM. Tout autre cas (texte, vCard, actions, mot de passe, pause, inconnu) : 302 vers `WEB_URL/q/<slug>`. Un code en pause ne compte aucun scan. Le scan est écrit **avant** de répondre (instance serverless figée après la réponse) ; un échec d'écriture ne bloque jamais la redirection.

### UTM
Précédence par paramètre : variante scannée (`/r/<slug>?utm_source=affiche`) > valeurs du code > paramètres déjà présents dans la destination (`service.ResolveTarget`). La campagne enregistrée est la campagne effective.

### Statistiques
`GET /api/v1/stats?from&to&tz&qr_code_id` : totaux, période précédente de même longueur, série par jour, heures, jours de semaine, ventilations (appareil, OS, navigateur, pays, ville, langue, provenance, UTM) repliées au-delà de 8 en « Autres », top 5 des codes. Pays et ville viennent des en-têtes Vercel/Cloudflare : vides en local.

### Création sans compte (`/creer`)
Même éditeur en mode `guest` : types lien, texte, Wi-Fi, e-mail, appel (`GUEST_KINDS`), contenu écrit dans le motif (`staticPayload`) donc ni modifiable ni comptabilisé, pas de logo ni de cadre, export PNG 512 px seulement. Rien ne passe par l'API. Les limites sont côté navigateur (un code statique ne coûte rien au serveur) ; elles servent l'offre, pas la sécurité. Comparatif « Avec ou sans compte » (`PlanComparison`) sur `/creer` et l'accueil.

### Éditeur
L'étape et le type sont dans l'URL (`?etape=1|2|3&type=`), le brouillon (contenu, nom, apparence, jamais de mot de passe) dans le `sessionStorage` de l'onglet (`lib/draft.ts`, clés `qrstats:draft:new|guest|edit:<id>`). Quitter la page ou recharger reprend au même endroit ; le brouillon est effacé après l'enregistrement. Un brouillon de modification ne s'applique qu'à la version du code dont il est parti (`stamp` = `updated_at`).

### Redirection selon le visiteur (règles)
Un code lien peut avoir jusqu'à 10 règles `{field, value, url}` (`field` : `os`, `device`, `country`, `language`), validées par `service.NormalizeRules` et appliquées par `PickRule` à la redirection et au déverrouillage : la première qui correspond gagne, sinon la destination principale. Les UTM s'ajoutent ensuite. Les règles ne quittent jamais le serveur (`Public.Rules` en `json:"-"`). Un changement de type vers autre chose qu'un lien les efface.

### Types spécialisés
WhatsApp, Instagram, Facebook, TikTok, YouTube, LinkedIn, Avis Google (`lib/social.ts`) : des codes lien (`kind: url`) dont le formulaire construit le lien à partir d'un identifiant ou d'un numéro, avec le logo de la marque posé automatiquement. Rien de spécifique côté API.

### Lisibilité
Chaque code est décodé dans le navigateur (jsQR, à 200 et 400 px) tel qu'il sera téléchargé, et le contraste encre/fond est mesuré (`lib/scan-check.ts`) : sous 2,5:1 il est déclaré illisible même si le décodeur le lit (une image parfaite n'est pas un papier sous une lampe), sous 4:1 fragile. Badge dans l'éditeur (étape 3) et sur la fiche.

### Apparence
Le design est un objet JSON opaque pour l'API (≤ 400 Ko, logo inclus), dont le web possède la forme (`designSchema`, lecture tolérante). Rendu `qr-code-styling` + cadres SVG maison (`lib/qr-render.ts`) : le QR est imbriqué en `<svg>` vectoriel (jamais en `<image>`, flou une fois agrandi), marge de silence de 5 %. Export compte : PNG 1024, 2048 ou 4096 px (dessiné à la taille finale), SVG vectoriel et PDF A4 (jsPDF chargé à la demande). Forme carrée ou ronde ; 12 styles prêts à l'emploi (`lib/style-presets.ts`, tous à fort contraste). Logo : 14 marques (simple-icons, CC0), SVG importé gardé vectoriel, ou image ramenée à 1024 px en WebP (design de 1,5 Mo au plus côté API). Correction d'erreur H avec logo, Q sinon.

## Identité visuelle

Un seul motif : la grammaire du QR code (carrés de repérage, modules), dans le panneau d'authentification (`FinderArt`) et les pages 404/500 (`StatusPage`, un code cassé). Outremer `#2d3cf0` pour les actions, encre `#14161f`, fond `#f6f7f9`, panneau sombre `--hero`. Polices : Bricolage Grotesque (titres, chiffres), Inter Tight (interface), JetBrains Mono uniquement pour les slugs imprimés. Pas de libellés en capitales, pas de séparateurs « · ». Coins du QR pleins par défaut (lisibilité). Graphiques : palette catégorielle de référence (slots 1 et 2), clair et sombre, jetons dans `styles.css`.

## Accessibilité

Vise WCAG 2.2 AA : `eslint-plugin-jsx-a11y` strict bloquant, lien « Aller au contenu », un seul `h1`, repères, focus visible, cibles de 44 px, erreurs en `role="alert"`, `prefers-reduced-motion` respecté. Chaque graphique a son équivalent texte (tableau ou liste masquée).

## Conventions

- **Commentaires** : aucun par défaut ; si nécessaire, 1 à 2 lignes sur le *pourquoi*.
- **Pas de tiret cadratin, pas d'emoji** dans le code, les commits et la doc.
- **Langues** : identifiants, fichiers, commits et logs en anglais ; textes visibles en français.
- **Commits** : `feat: ...`, `fix: ...`, `ref: ...` (message court, anglais, sans Co-Authored-By).
- **Glossaire** : QR code (le code et sa fiche), slug (identifiant imprimé, immuable), destination (ce vers quoi mène le code), scan (une ouverture de `/r/<slug>` par un humain), visiteur unique (empreinte du jour), code dynamique / statique, design (apparence), cadre (habillage « Scannez-moi »), mise en pause, campagne (triplet UTM). Pas de synonymes.
- **Identifiants** : UUIDv7. **Dates** : stockées en UTC, jours lus dans le fuseau du lecteur.
- **Frontend** : imports `@/...` ; formulaires `useAppForm` ; mutations via `isPending`, jamais `useState` ; `onSuccess` valide la forme (zod, `isQr`) ; modales via `components/shared/app-modal.tsx` ; listes paginées côté serveur (25 par page) ; primitives shadcn (Radix, comme charlomi) régénérées par `pnpm exec shadcn add`.
- **API** : erreurs `{error, code, field?}`, pagination `{data, total, page, per_page, pages}`, Swagger sur `/swagger/index.html` (`swag init -g cmd/server/main.go --parseInternal -o docs`).
- **Serveurs** : toujours via Portly. **pnpm** côté web, Go 1.26 (toolchain) côté API.

## Commandes

- Base : `docker compose up -d` (Postgres 17 sur 5470, bases `qrstats` et `qrstats_test`).
- Portly : projet `qrstats`, serveurs `api` (8110, `go run ./cmd/server`) et `web` (3110, `pnpm dev`).
- Première installation : `MIGRATE_ON_START=true` dans `api/.env`, puis `curl -X POST -H "Authorization: Bearer $MAINTENANCE_SECRET" localhost:3110/api/maintenance/auth-migrate`.
- Migration hors démarrage : `cd api && go run ./cmd/migrate`.
- Comptes locaux : `account.md` à la racine (non versionné).

## Déploiement

Vercel, équipe `riri122s-projects`, deux projets déployés en CLI depuis leur dossier (`cd api && vercel deploy --prod`, idem `web`) :

| Projet | Dossier | URL |
| --- | --- | --- |
| `qrstats-api` | `api/` | https://qrstats-api.vercel.app (fonction Go `api/api/index.go`, tout réécrit vers elle par `api/vercel.json`) |
| `qrstats-web` | `web/` | https://qrstats-web.vercel.app (TanStack Start, preset Nitro Vercel, Node 22) |

- La fonction Go est compilée **hors du module** : elle n'importe que `qrstats/app` (`app.FromEnv`), jamais `internal/`.
- Variables de production posées dans chaque projet (voir les `.env.example`) ; secrets générés, jamais affichés. `MAINTENANCE_SECRET` du web dans `account.md` (non versionné).
- `DATABASE_URL` : base Postgres fournie par le porteur du projet, à ajouter dans **les deux** projets (le web lit `AUTH_DATABASE_URL` puis `DATABASE_URL`).
- Migrations : `MIGRATE_ON_START=true` pour l'instant (AutoMigrate idempotent à chaque démarrage à froid, à passer à `false` une fois le schéma stable) ; tables Better Auth par `POST https://qrstats-web.vercel.app/api/maintenance/auth-migrate` avec `Authorization: Bearer $MAINTENANCE_SECRET`.
- Dépôt : https://github.com/aristoteodjo/qrstats (public). Pas encore relié à Vercel pour les déploiements automatiques (il faudrait régler le Root Directory de chaque projet sur `api` / `web`).

## Ordre de construction

1. Socle : ce document, outillage, composants partagés, coque (sidebar shadcn), pages obligatoires, auth. **Fait (2026-11-18).**
2. QR codes dynamiques : assistant 3 étapes (type, contenu, aspect), aperçu téléphone, destination modifiable, pause, mot de passe, téléchargement PNG/SVG, page de scan. **Fait (2026-11-18).**
3. Suivi des scans et analyses (globales et par code). **Fait (2026-11-18).**
3b. Liste des QR codes en cartes (miniature, lien court, destination, scans, dates, statut, partage, téléchargement), filtres statut/type, tri, actions groupées, renommage. **Fait (2026-11-18).**
4. Refonte visuelle (auth, accueil, 404/500, barre latérale) vérifiée dans Chrome headless local (`playwright-core`, parcours inscription → création → liste → analyses). **Fait (2026-11-18).**
5. Inspiré de qrcode-ai.com (2026-11-18) : vérification de lisibilité, styles prêts à l'emploi, forme ronde, types réseaux sociaux, export PDF, redirection selon le visiteur. **Fait.** Restent : QR art par IA (fournisseur à choisir), QR sur image de fond, génération en lot (CSV), domaine personnalisé, équipes, export CSV des scans.
6. Facturation et limites par offre (si décidé).

## Décisions

### Prises
- 2026-11-18 : backend Go (gin, gorm, Postgres) pour la redirection et le suivi ; comptes personnels ; déploiement Vercel.
- 2026-11-18 : un seul hôte web au lieu de `site` + `app.` : `app.localhost` ne se résolvait qu'en IPv6 sur macOS et Safari n'atteignait pas l'app ; un hôte unique supprime aussi les cookies inter-domaines et les redirections de connexion.
- 2026-11-18 : tracking : scans, uniques (sans IP), appareil/OS/navigateur, pays/ville (en-têtes de la plateforme), langue, provenance, UTM, heure et jour de semaine, comparaison avec la période précédente.
- 2026-11-18 : shadcn en variante Radix (comme charlomi, dont les composants sont copiés), pas Base UI.
- 2026-11-18 : liste calquée sur la capture MyQRCode ; bandeau « Essai gratuit », sondage et compteur de jours d'essai non repris tant que l'offre n'est pas décidée.
- 2026-11-18 : pas de champ téléphone international (phone-input de charlomi non copié) : l'auth est email + mot de passe.

- 2026-11-18 : création sans compte autorisée (codes statiques, types et export limités) pour donner envie de créer un compte.
- 2026-11-18 : pages légales : éditeur Aristote ODJO, particulier (adresse non publiée), contact public `oaristote@gmail.com`, hébergeur Vercel Inc., base Neon Inc., droit béninois (Code du numérique, loi 2017-20), autorité APDP. Scans conservés tant que le QR code existe (effacés avec lui). Suppression de compte sur demande par e-mail (pas encore de bouton).

### Ouvertes (ne pas trancher à la place du porteur du projet)
- Nom de domaine et domaine court des QR codes (le domaine court est figé dans chaque code imprimé : à choisir avant la première impression réelle).
- Runtime Go de Vercel validé pour la compilation (2026-11-18) ; à surveiller : démarrage à froid et durée des migrations.
- Géolocalisation hors Vercel/Cloudflare (base GeoLite locale ?).
- Inscriptions ouvertes à tous ou sur invitation ; vérification de l'e-mail ; mot de passe oublié (fournisseur d'e-mail).
- Offres et facturation (entrée « Facturation » des captures non construite).
- Disponibilité et tarifs (CGU) : encore `[À compléter]`.

## Pièges connus

- gorm cite `Group("1")` comme une colonne : grouper par alias (`Group("date")`, `Group("key")`).
- `*.localhost` se résout en `::1` seulement sur macOS : le serveur de dev doit écouter en IPv6 (`vite dev --host ::`).
- Une ventilation vide doit sortir en `[]`, jamais `null` (le schéma zod du web la refuse) : `TopBuckets` part de `[]Bucket{}`.
- Le serveur web de Portly n'a pas `pnpm` dans son PATH : la commande exporte le PATH nvm.
- Le Chrome relié à Claude in Chrome tournait sous Windows (autre machine) le 2026-11-18 : vérifier avec le Chrome local en headless (`playwright-core` et `executablePath` de Google Chrome).
