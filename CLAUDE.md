# Ruche

Ruche est une plateforme : une administration web, une app mobile et leur base, installées pour chaque client. Le code ne nomme aucun client ; chaque installation a ses réglages dans son propre dépôt (`installation/README.md`). Le dépôt contient aussi la démo de Ruche.

| Dossier | Rôle | Techno principale | Instructions propres |
|---|---|---|---|
| `web/` | Administration | React + Vite, éditeur Tiptap, glisser-déposer dnd-kit, tests Vitest | [web/CLAUDE.md](web/CLAUDE.md) |
| `mobile/` | App mobile (pas encore commencée) | React Native + Expo, navigation Expo Router | [mobile/AGENTS.md](mobile/AGENTS.md) |
| `supabase/` | Base et serveur | Postgres, connexion des utilisateurs, stockage de fichiers, fonctions serveur, tests pgTAP | [supabase/CLAUDE.md](supabase/CLAUDE.md) |
| `blocks/` | Forme des blocs, source unique | JSON Schema (draft-07) | [supabase/CLAUDE.md](supabase/CLAUDE.md) |

Les deux applications sont en TypeScript et se connectent à Supabase avec `@supabase/supabase-js`. Chaque dossier a son propre `package.json` et son propre `node_modules` (pas de workspace npm). Le `package.json` de la racine ne contient que le CLI Supabase et les scripts communs.

**Nouveau départ.** Ruche repart de zéro. Aucun terme, aucune structure ni aucun choix d'un ancien projet n'est repris sans être redécidé. On emploie des mots courants.

**La documentation** : [docs/README.md](docs/README.md) dit quel document lit qui. Deux font règle :
- [docs/BONNES-PRATIQUES.md](docs/BONNES-PRATIQUES.md), pour tout changement, pour l'utilisateur comme pour moi. Je la relis avant de travailler et je la suis ; une pratique qui change s'y écrit d'abord, avec l'accord de l'utilisateur.
- [docs/ADMINISTRATION.md](docs/ADMINISTRATION.md), les décisions de l'admin (cité « ADMIN § n »). À lire avant de travailler sur `web/`.

Le code cite ces documents par leur nom, leurs numéros de section (« § 2.1 », « Étape 4 ») et leurs décisions (« [D18] ») : on ne les renomme pas et on ne renumérote pas leurs sections.

## À ne jamais faire

- Travailler directement sur `main`, ou fusionner sans l'accord de l'utilisateur ni avec un garde-fou rouge.
- Mettre un secret dans le dépôt, dans `web/` ou dans `mobile/` : seule la clé **publishable** (`sb_publishable_…`) va côté client ; jamais la clé secrète (`sb_secret_…`). Je ne saisis jamais de clé secrète : c'est l'utilisateur qui la colle. Le dépôt est public.
- Lancer moi-même une commande de production (`config push`, `secrets set`, `db push`, `functions deploy`).
- Déclarer `[auth.email.smtp]` dans `supabase/config.toml` : un `config push` effacerait le SMTP réglé à la main.
- Remettre à zéro la base locale de l'utilisateur (`db:reset`) ou lancer tous les parcours Playwright sans le prévenir (BONNES-PRATIQUES § 6).
- Modifier à la main un fichier généré (`blocks/generated/`, `web/src/blocks/generated/`, `web/src/lib/database.types.ts`, `web/src/lib/generated/`, `supabase/tests/aides/blocs-cas.inc`, migrations `…_schema_blocs.sql`) ou une migration déjà fusionnée.
- Écrire un texte de l'interface en dur dans un composant (tout passe par `web/src/texts/`, l'anglais d'abord).

## Versions de référence

Elles ont été vérifiées sur npm et Expo le 27/09/2026. Elles sont épinglées sans `^` dans `web/` et à la racine. Ne les monte pas sans vérifier la compatibilité.

**Administration (`web/`)**
- React 19.3, Vite 8.3, React Router 8.4
- Tiptap 3.31 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`)
- dnd-kit : `@dnd-kit/core` 6.3, `@dnd-kit/sortable` 10.0, `@dnd-kit/utilities` 3.2
- Tailwind CSS 4.3 + shadcn/ui (composants Base UI, style « base-nova », couleurs de départ Neutral pour la base, le thème et les graphiques, preset shadcn `bJMSkfGi` ; chacun peut choisir les siennes dans Mon compte, `lib/palettes.ts`), icônes Lucide, police Inter
- Sentry 11 (`@sentry/react`)
- Vitest 5.0 (jsdom + Testing Library)
- ESLint 10.11 + typescript-eslint 8.70, Prettier 3.9
- **TypeScript 6.0, pas la 7** : typescript-eslint n'accepte pas encore la 7 (peer `<6.1.0`).

**App mobile (`mobile/`)** : c'est Expo qui fixe les versions
- Expo SDK 57 (57.0.25), React Native 0.86, React 19.2, Expo Router 57
- Reanimated 4.5, Gesture Handler 2.32, Screens 4.26
- TypeScript 6.0
- ESLint 9 via `eslint-config-expo`, installé par `expo lint`. Ce n'est pas la même version qu'en web, et c'est voulu.
- Ajouter une dépendance **uniquement** avec `npx expo install <paquet>`, jamais `npm install`. Voir aussi `mobile/AGENTS.md`.
- Routes dans `mobile/src/app/` ; le reste du code (composants, hooks, utilitaires) va en dehors de `src/app/`.

**Base et serveur**
- Supabase CLI 2.120 (devDependency à la racine ; même version dans les garde-fous et la sauvegarde, vérifiée le 07/10/2026), supabase-js 2.117, Postgres 17

**Node 24 partout** : `.nvmrc` à la racine, `engines` dans les `package.json` (Vercel s'en sert), et les garde-fous GitHub.

## Commandes

```bash
# Serveurs locaux (Docker Desktop ouvert)
npm run local                  # Supabase s'il ne tourne pas, puis l'admin dans ce terminal (Ctrl + C l'arrête)
npm run local:stop             # arrête l'admin et Supabase (données gardées)

# Administration
cd web && npm run dev          # serveur de dev
cd web && npm run lint         # ESLint
cd web && npm run lint:dead    # code, fichiers et dépendances inutilisés (knip, web/knip.json)
cd web && npm run lint:dup     # copier-coller de plus de 10 lignes (jscpd, web/.jscpd.json)
cd web && npm run format       # Prettier (format:check pour vérifier seulement)
cd web && npm test             # tests (test:watch pour relancer à chaque changement)
cd web && npx vitest run src/lib/titles.test.ts   # un seul fichier de tests
cd web && npm run test:e2e     # tests de parcours Playwright (Supabase local démarré, Realtime compris ; la 1re fois : npx playwright install chromium)
cd web && npm run build        # vérification des types + construction
cd web && npx shadcn add <composant>   # ajouter un composant shadcn/ui

# App mobile
cd mobile && npx expo start    # serveur de dev (génère aussi expo-env.d.ts)
cd mobile && npx expo lint
cd mobile && npm run typecheck
cd mobile && npx expo-doctor

# Supabase (Docker doit tourner)
npm run db:start               # démarre Supabase en local
npm run db:reset               # réapplique les migrations (efface la base locale : prévenir l'utilisateur)
npx supabase migration up      # applique une nouvelle migration sans rien effacer
npm run db:test                # tests pgTAP de supabase/tests/ (aides communes : supabase/tests/aides/roles.inc)
npx supabase test db supabase/tests/33_verrou.test.sql   # un seul fichier pgTAP
npm run functions:test         # fonctions serveur equipe et files (Deno via npx : format, lint, types, tests)
npm run functions:integration  # fonction files contre le Supabase local : vrais envois, tâche « fichiers » (~1 min)
cd web && npm run db:types     # après chaque migration : régénère web/src/lib/database.types.ts (+ Prettier)
cd web && npm run palettes:generate  # les couleurs des palettes, tirées des thèmes de shadcn à une version fixe (lib/generated/palettes-data.ts ; réseau)
cd web && npm run blocks:generate  # après chaque changement de blocks/ : types, validateurs, cas pgTAP, empreinte et, si le schéma a changé, nouvelle migration
npm run db:stop
```

## Configuration

- `web/.env` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, et `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT` (vides : rien n'est envoyé à Sentry) ; modèle dans `web/.env.example`.
- `mobile/.env` : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (modèle dans `mobile/.env.example`).
- Les fichiers `.env` sont ignorés par git. Par défaut, ils pointent vers le Supabase **local**. Les valeurs du projet en ligne sont en commentaire dans les `.env.example`.
- Projet Supabase en ligne de la démo : « Ruche », réf. `lnhjalrrvbokxwimmfxx` (https://lnhjalrrvbokxwimmfxx.supabase.co). Les `.env` locaux (projet Supabase `ruche` dans `supabase/config.toml`) n'y touchent jamais.
- Le client Supabase est dans `web/src/lib/supabase.ts` et `mobile/src/lib/supabase.ts`.

## Façon de travailler

- **Une branche par chantier.** Quand l'utilisateur dit « commite et pousse », je pousse la branche et j'ouvre une demande de fusion (pull request) sur GitHub.
- Les garde-fous (`.github/workflows/garde-fous.yml` : Administration, Base de données, Fonctions serveur, Parcours) tournent sur chaque demande de fusion, et Vercel crée une adresse de test.
- **La règle `main`** (GitHub, Settings › Rules › Rulesets) impose : demande de fusion obligatoire, Squash seulement, les quatre garde-fous exigés, ni suppression ni poussée forcée, personne ne la contourne. Vercel ne met en production que si « Administration » et « Base de données » sont au vert (Deployment Checks). Un garde-fou renommé doit l'être aussi dans la règle `main` et dans Vercel.
- **Quand je fusionne** : l'utilisateur m'a donné carte blanche pour construire ce qui est décidé dans docs/ADMINISTRATION.md, mais il essaie d'abord chaque modification sur l'admin locale (BONNES-PRATIQUES § 1). Je ne fusionne donc qu'après son accord, et seulement si tous les garde-fous sont au vert (`gh pr checks`). Je fusionne une étape seulement quand la précédente est en ligne (base et fonctions), pour que l'admin en ligne reste cohérente avec sa base.
- La fusion se fait en un seul commit (`gh pr merge --squash`), avec le titre et la description de la demande : ils doivent donc être soignés. La branche est ensuite supprimée par GitHub.
- **Avant de dire qu'une tâche est finie** : lint, vérification des types et tests de la partie touchée.
- **La démo en ligne : https://admin.ruche.website** (projet Vercel `ruche`, équipe `vincent-lo-re`, dossier `web` ; domaine `ruche.website` acheté et géré chez Vercel), aussi https://ruche-nu.vercel.app. Une nouvelle adresse de l'admin s'ajoute à `ADMIN_ORIGINS` (`installation/functions.env`, puis `secrets set`) et aux redirections de `[remotes.demo]` (`config push`).
- Services de la démo : Vercel `ruche`, Supabase « Ruche » (`lnhjalrrvbokxwimmfxx`), Brevo (compte de Ruche, domaine `ruche.website`, expéditeur `ne-pas-repondre@ruche.website`) ; pas de Sentry pour l'instant. L'utilisateur m'a donné la main sur GitHub, Supabase, Vercel et Brevo via Chrome ; chaque changement de réglage se fait avec son accord.

## Mise en production de la base et des fonctions

- **La démo** (projet Supabase `lnhjalrrvbokxwimmfxx`) est reliée au dépôt par l'intégration GitHub de Supabase depuis le 08/10/2026 : chaque fusion dans `main` y applique les migrations et déploie les fonctions, sans commande.
- Ses réglages propres se font une fois, à la main, par l'utilisateur, comme pour toute installation (`installation/README.md`) : connexion (`[remotes.demo]` de `supabase/config.toml`), `ADMIN_ORIGINS` des fonctions (`installation/functions.env`), `private.settings`, premier admin (inviter depuis le tableau de bord, puis le SQL de docs/ADMINISTRATION.md § 2).
- **Les commandes de production restent à l'utilisateur** (`config push`, `secrets set`, et `db push` ou `functions deploy` pour une installation sans lien GitHub) : le garde-fou de Claude Code refuse que je les lance. Je prépare les commandes exactes, et je vérifie ensuite en lecture seule (`config diff`, appels à `public.ping()`, codes de retour des fonctions).
- Ordre pour les réglages : `npx supabase config diff` (relire ; sa première ligne dit « using [remotes.<nom>] »), puis `npx supabase config push`. Le SMTP de l'installation doit être branché dans le tableau de bord **avant** le premier `config push` : sur l'offre gratuite, Supabase refuse de modifier les modèles d'e-mails avec son service d'envoi intégré.
- **La base avant l'admin** : un changement avec une migration (ou une fonction) se fusionne en deux demandes : la migration seule, que l'intégration GitHub met en ligne, puis l'admin qui s'en sert (BONNES-PRATIQUES § 1).
- Le workflow planifié `.github/workflows/garder-actif.yml` appelle chaque jour `public.ping()` sur la démo (clé publishable) pour éviter la pause du projet gratuit. Il ne tourne que depuis `main`.
- **Sauvegarde** (l'offre gratuite n'en fait pas) : `.github/workflows/sauvegarde.yml`, **seulement dans un dépôt privé** (les artifacts d'un dépôt public sont téléchargeables par tout compte GitHub : il est désactivé dans Ruche, public, et sert de modèle aux dépôts des installations). Ce qu'il garde, son secret `SUPABASE_DB_URL` et la restauration : voir [supabase/CLAUDE.md](supabase/CLAUDE.md).
