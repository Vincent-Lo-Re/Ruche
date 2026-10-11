# Base et serveur (`supabase/`, `blocks/`)

Les règles de la base sont dans [docs/BONNES-PRATIQUES.md](../docs/BONNES-PRATIQUES.md) (§ 4 et § 5) ; le modèle de données, les droits, la publication et les fichiers, dans [docs/ARCHITECTURE-CONTENUS.md](../docs/ARCHITECTURE-CONTENUS.md). Ici : ce qu'il faut savoir pour écrire une migration, un test ou une fonction serveur. La mise en production est dans le [CLAUDE.md](../CLAUDE.md) de la racine.

## Migrations

- Schéma de la base : uniquement par des migrations dans `supabase/migrations/` (`npx supabase migration new <nom>`). Une migration fusionnée ne se modifie plus.
- Chaque table a sa politique RLS et un test pgTAP dans `supabase/tests/`, puis `cd web && npm run db:types` (le garde-fou « Base de données » refuse des types pas à jour).
- Toute fonction créée par une migration : retirer l'`EXECUTE` à `public` et `anon` (et `authenticated` si elle n'est pas appelée par l'admin), et ne jamais rendre une fonction de `private` exécutable par `anon` ou `authenticated` (sauf `reader_can_open`) : `supabase/tests/05_prive.test.sql` le vérifie.
- Seules exceptions dans `public` pour `anon` : `ping()`, `admin_brand()` et `admin_brand_variants()` (l'identité de l'admin, pour la page de connexion) et les lectures de l'app `app_*` (`security definer`, `stable`, `search_path` vide, qui ne lisent que ce qui est en ligne : par `private.live` pour les contenus, directement pour des réglages sans brouillon comme `app_brand()`) ; une nouvelle `app_*` s'ajoute à la liste fermée de `05_prive.test.sql`.
- Les erreurs des fonctions de la base ont un code stable, traduit par l'admin (`texts.x.errors` de `web/src/texts/`) ; leurs faits partent en JSON dans `hint`, et leur `detail`, en français, ne s'affiche jamais (`describeFacts` de `web/src/lib/error-facts.ts`).

## Forme des blocs (`blocks/`)

- Source unique : `blocks.schema.json` en draft-07 écrit à la main, `blocks.tokens.json`, cas partagés `cases/*.json` avec `{ description, variant, valid, data }`.
- Jamais de `oneOf`/`anyOf`/`allOf`/`format` (pg_jsonschema 0.3.3 : validation exponentielle, formats ignorés) : les unions s'écrivent en `if`/`then`/`else` sur `type`, avec `tsType` pour les types.
- On ne fait qu'ajouter. Exceptions : le résumé, retiré le 04/10/2026 quand aucun contenu n'existait ; la variante « style » et la teinte de l'Encadré, retirées le 10/10/2026 avec la première charte graphique de l'app (`…_charte_app_retiree.sql`).
- Tout ce qui en est tiré (`blocks/generated/`, `web/src/blocks/generated/`, `supabase/tests/aides/blocs-cas.inc`, migrations `…_schema_blocs.sql`) est produit par `cd web && npm run blocks:generate` et ne se modifie pas à la main ; les garde-fous le relancent (job « Administration ») et comparent l'empreinte de la base (job « Base de données »).
- Dans un worktree, lancer `blocks:generate` depuis la copie de travail principale, jamais à travers un `node_modules` relié par un lien symbolique.

## Tests pgTAP

- Un fichier par sujet, qui commence par `begin;` puis `\ir aides/roles.inc` (profils anonyme, éditeur aal1/aal2, admin, lecteur sans fiche).
- Les aides portent l'extension `.inc` : `supabase test db` lance tout `.sql` et `.pg`, sous-dossiers compris.
- Pour la publication, `aides/publication.inc` : contenus nommés, `pg_temp.save`, `pg_temp.publish`, fichiers, formules et catégories de départ ; `pg_temp.cover()` en « extra » de `pg_temp.draft` (un article ou un épisode ne se publie ni ne se programme sans image mise en avant, [D45]).
- Une version ne se vide jamais (`TRUNCATE` refusé) : `pg_temp.empty_contents()` supprime les contenus, et leurs versions partent en cascade.
- Deux sessions (verrous de ligne) : `40_corbeille_concurrence.test.sql` ouvre la seconde par `dblink` (mot de passe local `postgres`), valide ses données puis les efface ; un tel fichier ne vide jamais `media` (un `TRUNCATE` bloquerait la seconde session).
- Les tests Vitest des SVG lisent les fichiers types de `supabase/functions/files/fixtures/` : un SVG nettoyé par l'admin doit rester accepté par le serveur.

## Fonctions serveur

- Les adresses de l'admin acceptées viennent du secret `ADMIN_ORIGINS`, lu par `supabase/functions/_shared/cors.ts` (avec `http.ts`, ce que les deux fonctions partagent ; un dossier en `_` n'est pas déployé seul).
- `equipe` a `verify_jwt = false` et vérifie elle-même la session : `is_staff()` pour lire la liste (un éditeur la lit, depuis le 09/10/2026), `is_admin()` pour tout le reste.
- `files` a aussi `verify_jwt = false` : sans session de membre, elle ne fait que le travail décidé par la base (mode `kick`, avec un frein en base) ; avec un membre aal2 (`is_staff()`), tous les modes.
- Les deux sont déployées par l'intégration GitHub. Tests : `npm run functions:test` et `npm run functions:integration` à la racine.

## Tâches planifiées (pg_cron + pg_net)

- **Rien à régler en ligne.** La tâche `publications` (chaque minute, `private.run_due_publications()`) publie les programmations dues.
- L'adresse de `files` et la clé publishable de l'installation sont dans `private.settings` : une migration y écrit des valeurs d'attente, que chaque installation remplace une fois (`installation/README.md`, étape 3) ; `supabase/seed.sql` (local seulement) y met les valeurs locales. Aucun secret n'est rangé dans la base.

## Sauvegarde

`.github/workflows/sauvegarde.yml` (dépôt privé seulement : désactivé dans Ruche, public), chaque lundi à 03:30 GMT ou à la main (Actions › « Sauvegarde de la base » › Run workflow).
- Il lit la base par le secret GitHub `SUPABASE_DB_URL` (chaîne « Session pooler », mot de passe compris, créée par l'utilisateur).
- Il garde 90 jours un artifact : `roles.sql`, `structure.sql`, `donnees.sql` (schémas `public` et `private`) et `comptes.csv` (comptes sans aucun secret). Les fichiers du stockage n'y sont pas.
- Restauration : base vide aux migrations à jour (`db push`), puis `psql "<url>" -f donnees.sql` (le fichier coupe les déclencheurs le temps de l'import) ; les comptes se recréent par invitation.
