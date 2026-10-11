# Contenus : architecture (étapes 3 à 7)

> La référence de la base et du code des contenus, **tenue à jour** (revue contre la base et le code le 10/10/2026). « ADMIN § n » renvoie à `docs/ADMINISTRATION.md` ; un « § n » seul, à **ce** document. L'histoire de la construction est dans [docs/archives/journal-construction.md](archives/journal-construction.md) : un historique, pas une référence.
> Cadre : l'offre **gratuite** de Supabase (500 Mo de base, 1 Go de fichiers, 50 Mo par fichier, ni transformation d'images ni vidage du cache CDN) et Vercel Hobby. L'offre Pro est prévue avant le lancement de l'app (ADMIN § 8) ; rien ici n'en dépend.
> **Sortes de contenus** : `article`, `episode`, `page` et `template` (modèle de bloc). L'ancien système des méthodes est retiré (`…_methodes_retirees.sql`, 06/10/2026 ; `…_menage_de_la_base.sql`, 08/10/2026) ; les méthodes refaites ne sont pas construites (§ 1.8).
> Chaque partie commence par un **En bref** sans technique. Les choix faits en autonomie sont notés **[Dn]** (§ 8.1). Les règles générales de la base (migrations, droits des fonctions, tests pgTAP) sont dans `docs/BONNES-PRATIQUES.md` (§ 4 et § 5) et `supabase/CLAUDE.md`.

## En bref

1. Tout ce qui s'écrit (article, épisode, page, modèle) est dans **une seule table** : éditeur, enregistrement automatique, verrou « un seul à la fois » et corbeille s'écrivent une fois.
2. Chaque contenu a **un brouillon**. « Publier » en fait une **copie figée**, que l'app lit ; les copies forment l'historique.
3. Les méthodes ne sont pas dans la base : leur structure viendra avec sa migration (ADMIN § 1).
4. La forme des blocs est décrite **une seule fois** ; l'admin et la base vérifient ce fichier, l'app le fera aussi.
5. Tout fichier arrive **protégé**. Il devient public quand un contenu gratuit publié l'utilise, ou s'il est l'image mise en avant d'un contenu publié, même réservé ; protégé sinon. Sans Pro, son ancienne adresse publique peut marcher encore deux minutes.
6. Programmations, vidange de la corbeille et rangement des fichiers se font **dans Supabase** : tâches planifiées et une seule fonction serveur.
7. L'app ne lit jamais les tables : des **fonctions de lecture** ne renvoient que ce qui est publié, et ce que le lecteur a le droit de voir.
8. Deux titres pareils ne cohabitent pas dans une section (majuscules et espaces ignorés).
9. Le § 6 garde le **contrat de la base** de chaque étape (3 à 7). Une question reste ouverte : les comptes des lecteurs (§ 8.2).

---

## 1. Modèle de données

> **En bref** : huit tables pour les contenus et les fichiers, plus deux tables techniques (verrou d'édition, contrôle des fichiers). Un contenu est une ligne avec son brouillon ; chaque publication est une ligne à part, qu'on ne modifie pas.

### 1.1 Conventions

- **Noms en anglais** **[D1]**.
- **`public`** : les tables (RLS partout) et les RPC. **`private`**, non exposé par l'API (`config.toml` n'expose que `public` et `graphql_public`) : fonctions internes, vue `private.live`, `private.settings`, schéma des blocs. Toute fonction `security definer` a `set search_path = ''` et des noms qualifiés.
- **Droits** : `revoke all … from anon, authenticated`, puis seulement le § 3.1. Dans `private`, l'`EXECUTE` par défaut de `PUBLIC` est retiré (§ 4.5).
- **Politiques** `to authenticated`, avec `(select public.is_staff())` : `anon` ne peut pas exécuter `is_staff()`.
- **RPC de l'admin** : `security definer`, `EXECUTE` retiré à `public` et `anon`, `private.require_staff()` (ou `require_admin()`) en tête. Le garde n'est que dans la RPC publique ; le travail est dans une fonction interne, comme `private.do_publish(content_id, author_id, origin, expected_rev)`, que `publish` appelle avec `auth.uid()` et la tâche `publications` avec l'auteur de la programmation (sous pg_cron, `auth.uid()` est nul et `is_staff()` faux).
- **Erreurs** : `P0001` et un `message` stable (`verrou_perdu`, `conflit_revision`, `titre_pris`…), faits dans `hint`, `detail` jamais affiché (`supabase/CLAUDE.md`).
- **Fonctions de la fonction Edge** : `public.files_*`, `EXECUTE` à `service_role` seulement (§ 3.7).
- **Dates** en `timestamptz`, affichées par `formatDateTime` (`web/src/lib/dates.ts`) au fuseau de l'admin.
- **Auteurs** : dans `contents` et `media`, `created_by`, `draft_saved_by`, `deleted_by`, `scheduled_by` → `profiles(id)` `on delete set null` (permis par le garde de corbeille, § 3.2) ; dans `versions`, `published_by` est un `uuid` **sans clé étrangère** et le nom est recopié (`published_by_name`), car une mise à `null` modifierait la version et bloquerait le retrait d'un membre ; dans `edit_locks`, `holder_id` → `profiles` `on delete set null` (retirer un membre libère ses verrous).

### 1.2 Vue d'ensemble

| Table | Rôle | Étape |
|---|---|---|
| `media` | La médiathèque. | 3 |
| `media_audit` | Contrôle hebdomadaire des fichiers orphelins. | 3 |
| `contents` | Tout ce qui s'écrit : brouillon et état (en ligne, programmé, corbeille). | 4 |
| `edit_locks` | Qui écrit quel brouillon. | 4 |
| `categories`, `content_categories` | Catégories du Blog et des Podcasts, et leurs brouillons. | 4 |
| `versions` | Copies figées : ce que lit l'app, et l'historique. | 5 |
| `access_levels` | Formules, de la moins à la plus complète (« Gratuit » n'est pas une ligne). | 5 |
| `reader_access` | **Provisoire** : la formule de chaque lecteur. Vide jusqu'au paiement. | 5 |
| `template_copies` | Où une mise en forme ou un point de départ a été copié. | 08/10/2026 |

Ailleurs : `profiles`, `admin_identity`, `admin_brand_variants` (ADMIN § 1) ; `private.settings` (§ 3.8).

### 1.3 `access_levels` (formules)

- `id`, `name` (1 à 100 caractères, unique à la casse près), `rank int` `unique deferrable initially deferred`.
- Écriture : `is_admin()` ; rangement par `access_levels_reorder(ids uuid[])`.
- **Suppression** **[D32]** : refusée (`formule_utilisee`) tant qu'un brouillon, un contenu en ligne (`private.live`) ou un lecteur (`reader_access`, `restrict`) s'en sert. Les anciennes versions gardent son nom (`access_level_name`) ; leur clé passe à `null`.
- Les versions figent l'**identifiant**, pas le rang : réordonner change aussitôt ce que chaque abonné ouvre **[D2]**.

### 1.4 `reader_access` (lecteurs), provisoire

Support provisoire pour tester les contenus réservés **[D37]**, à revoir avec le paiement (ADMIN § 10) ; les règles de lecture ne dépendent que de `private.reader_rank()`.
- `user_id` (clé, → `auth.users` `cascade`), `access_level_id` (→ `access_levels` `restrict`), `valid_until`, `source`, `created_at`. Écrite avec la clé secrète seulement ; un lecteur lit sa ligne.
- `private.reader_rank()` (`security definer`, `stable`) : rang de la formule valide de `auth.uid()`, ou `null` ; appelée seulement par des fonctions `security definer`.

### 1.5 `categories` et `content_categories`

- `categories` : `id`, `section` (`blog` ou `podcasts`), `name` (1 à 100), `position`, `created_at`, `unique (section, lower(name))`. Un déclencheur nettoie le nom (bords, NFC) et place en fin une position manquante ; la section ne change pas (`categorie_invalide`). Rangement : `categories_reorder`.
- Écriture directe par l'équipe : `insert` (`section`, `name`, `position`), `update` (`name`, `position`), `delete`. Doublon : `23505` ; nom vide ou trop long : `23514`.
- `content_categories (content_id, category_id)`, `cascade` des deux côtés ; Blog pour un article, Podcasts pour un épisode, rien pour les autres (déclencheur).
- Catégories **du brouillon** (`category_ids` de `save_draft`), recopiées dans `versions.category_ids` à la publication. Facultatives **[D44]**.
- Supprimer est définitif **[D28]** : cascade dans les brouillons ; l'app ignore les identifiants disparus ; l'historique affiche « catégorie supprimée ».

### 1.6 `contents` (la table commune)

Toutes les sortes, modèles compris **[D3]**, avec des `check` par sorte testés par pgTAP.

| Colonne | Détail |
|---|---|
| `id`, `created_at`, `created_by` | |
| `kind` | `article`, `episode`, `page`, `template` ; immuable (`contents_10_kind`, `sorte_immuable`) |
| `draft jsonb` | **le brouillon unique** (§ 2.2) |
| `title` | générée, `draft->>'title'` |
| `draft_rev int`, `draft_saved_at`, `draft_saved_by` | révision (conflits) et dernier enregistrement |
| `access_level_id` → `access_levels` `restrict` | article, épisode, page ; `null` = gratuit |
| `access_chosen bool default false` | vrai dès qu'on a choisi « Gratuit » ou une formule ; sinon `publish` et `schedule` refusent (`acces_a_choisir`) **[D41]** |
| `slug` | page : adresse **du brouillon** (`^[a-z0-9]+(-[a-z0-9]+)*$`, 100 au plus) ; celle en ligne est `versions.slug` ; `unique (slug) where kind = 'page' and deleted_at is null` |
| `template_sort` | modèle, obligatoire, immuable : `style`, `shared`, `starter` |
| `template_for` | `starter`, obligatoire, immuable : `article`, `episode` ou `page` **[D42]** |
| `live_version_id` | la version que lit l'app (`null` = absent de l'app) |
| `first_published_at` | première publication |
| `list_position integer` | article et épisode (toujours rempli ; `null` sinon) : place dans la section, la plus petite en tête ; un neuf arrive en tête (`contents_05_list_position`) ; `contents_reorder` ; suivie par l'admin et l'app **[D47]** |
| `scheduled_at`, `scheduled_by`, `scheduled_rev`, `schedule_error` | programmation : heure, auteur, révision ([D31]), échec |
| `deleted_at`, `deleted_by` | corbeille |
| `draft_media_ids`, `draft_template_ids` | tenus par le déclencheur du brouillon |

- `check` par sorte (`slug`, `template_sort`, `template_for`, `access_*`, `live_version_id`, `scheduled_*`, `list_position`) ; `deleted_by` seulement dans la corbeille ; `scheduled_rev` dès que `scheduled_at` est rempli.
- **Clé composite** `(live_version_id, id) → versions (id, content_id)`, `on delete set null (live_version_id)` : jamais la version d'un autre.
- `check (octet_length(draft::text) <= 262144)` **[D35]**.
- **Un titre par section** (ADMIN § 4) : index unique `contents_title_key` sur `(kind, private.title_key(title))`, hors corbeille et titre vide ; `title_key` : NFC, bords retirés, espaces réduits, minuscules (accents comptés). Les modèles forment une section ; un article et un épisode peuvent partager un titre. `content_create`, `save_draft`, `template_create_from` refusent (`titre_pris`) ; `restore` et `revert_to_version` renomment (« Mon article (2) », `private.free_title`, `titre_renomme`) ; `content_title_taken(kind, title, except_id)` le dit pendant la frappe.
- **Index** : `(kind, deleted_at, draft_saved_at desc)` ; `(scheduled_at)` partiel ; GIN sur `draft_media_ids`, `draft_template_ids` ; `contents_feed_idx` `(kind, list_position, id)` des contenus en ligne (`app_feed`) ; le titre unique ; un index par auteur, sur `access_level_id`, `template_for` et la clé composite.

### 1.7 `versions` (copies figées et historique)

| Colonne | Détail |
|---|---|
| `id`, `content_id` → `contents` `cascade` | `unique (id, content_id)` pour la clé composite |
| `number` | 1, 2, 3… par contenu (`unique`) |
| `origin` | `manual`, `scheduled`, `template` (bloc partagé), `files` (textes de la médiathèque ou fichier remplacé, [D30], [D48]) |
| `body jsonb` | le brouillon figé, blocs partagés et textes alternatifs **résolus** (§ 2.4), variante `published` |
| `files jsonb` | par fichier cité : `kind`, `mime`, `alt`, `transcript`, `width`, `height`, `duration_s`, **figés** |
| `access_level_id` (`on delete set null`), `access_level_name` | accès et nom de la formule figés ; `null` = gratuit, ou formule supprimée |
| `slug` | pages : l'adresse que cherche `app_page` |
| `category_ids`, `media_ids`, `template_ids` | catégories, fichiers (couverture et audio compris), blocs partagés (GIN) |
| `cover_media_id` | l'image mise en avant (§ 4.4) ; `check` : dans `media_ids` |
| `block_types text[]` | sortes de blocs utilisées (prévenir une ancienne app) |
| `draft_rev` | révision d'origine (« modifié depuis la publication ») |
| `published_at`, `published_by`, `published_by_name` | § 1.1 |

- **Une version ne change pas** : aucun droit `update`/`delete` ; `versions_immutable` (`before update or delete`, `before truncate`) refuse (`version_immuable`), sauf la cascade d'un contenu effacé et la mise à `null` d'`access_level_id` d'une formule supprimée.
- Un modèle n'a jamais de version.

### 1.8 Les méthodes, en écrans (plan du 06/10/2026, ses points ouverts tranchés par QCM ; à construire)

**Pas construit.** Le plan est dans ADMIN § 1, « Méthodes, refaites en écrans » ; il sera décrit ici avec sa migration. Plan de la base du 06/10/2026 et ancien système : [journal archivé](archives/journal-construction.md).

### 1.9 `media` (médiathèque)

| Colonne | Détail |
|---|---|
| `id`, `kind` | `image`, `svg`, `lottie`, `audio`, `pdf` (pas de vidéo) |
| `name` | nom d'origine, mis en NFC par l'admin, `media_create` et le déclencheur (recherche `ilike`, chemin) |
| `path` | `<id>/<nom-nettoyé>.<ext>`, le même dans les deux buckets |
| `mime`, `size_bytes`, `width`, `height`, `duration_s` | lus par le navigateur (place réservée dans l'app) |
| `alt` / `transcript` | images et SVG / audios seulement (`check`) |
| `status` | `pending`, `checking` (SVG, Lottie), `ready`, `rejected` ; `status_changed_at` (nettoyage à 24 h) |
| `reject_reason`, `check_attempts` | § 4.3 |
| `is_public` | le bucket **réel** |
| `created_at/by`, `deleted_at/by`, `purge_requested_at`, `purge_error` | corbeille, effacement demandé ou refusé (§ 3.7) |
| `sync_error`, `sync_failed_at` | dernier échec de `files` : 10 minutes avant de réessayer |

- `check` `kind`/`mime` : `image` → `image/jpeg`, `image/png`, `image/webp` ; `svg` → `image/svg+xml` ; `lottie` → `application/json` ; `audio` → `audio/mpeg`, `audio/mp4` ; `pdf` → `application/pdf`. L'admin **normalise le type** (extension, premiers octets : `audio/x-m4a`, `audio/mp3`…) avant de le déclarer **[D33]**.
- `check (size_bytes <= 52428800)` ; 5 Mo au plus pour un SVG ou un Lottie **[D39]**. Index `(kind, deleted_at, created_at desc)`.
- **Un fichier ne se remplace jamais** : nouvelle version = nouveau fichier (nouvel `id`, nouvelle adresse) ; l'app met en cache par `id`.
- **« Où il est utilisé »** : `private.media_uses(id)` : les `contents` dont `draft_media_ids` le contient (modèles et corbeille compris) et les versions **en ligne** dont `media_ids` le contient ; pas l'historique **[D6]**.
- **« Non utilisés »** : colonne calculée `public.media_in_use(media)` (`security definer`, `stable` ; `null` hors de l'équipe en aal2, refusée à `anon`) = `exists (select 1 from private.media_uses(id))`, lue (`select=*,media_in_use`) et filtrée dans la base (`media_in_use=eq.false`). Test : `48_mediatheque_non_utilises.test.sql`.
- **« Remplacer… »** **[D48]** : nouveau fichier du même type et prêt (`private.replacement_pair` : `type_different`, `fichier_pas_pret`). `media_replace(old_id, new_id)` le met dans les brouillons, corbeille comprise, sauf ceux qu'un autre écrit (rendus), et lui passe `alt` et `transcript` de l'ancien s'il n'en a pas ; `media_replace_live` écrit une version `origin = 'files'` de chaque contenu en ligne qui cite l'ancien.

### 1.10 `edit_locks` (verrou « un seul à la fois »)

- `content_id` (clé, `cascade`), `holder_id` (`null` = libre), `holder_session` (l'ouverture de l'éditeur ; `null` après `content_create`), `taken_at`, `heartbeat_at`, `draft_rev`.
- **Périmé** si `heartbeat_at < now() - interval '90 seconds'`. Relâcher est un `UPDATE` (`holder_id` à `null`), que Realtime filtre et soumet à la RLS ; `menage` efface les lignes muettes depuis un jour.
- `draft_rev`, recopié à chaque enregistrement, est tout ce qu'écoutent les lecteurs : les messages restent minuscules. Les modèles ont le même verrou.

### 1.11 `media_audit`

`checked_at`, `orphan_paths text[]` (« `<bucket>/<chemin>` ») : objets Storage sans ligne `media`, trouvés en SQL par `private.audit_files()` dans `storage.objects` (§ 3.8). Lue par toute l'équipe dans la Médiathèque, avec « Nettoyer » (ADMIN § 2).

### 1.12 `template_copies` (copies des modèles)

Une mise en forme ou un point de départ est copié sans lien (§ 2.5) ; l'admin note chaque copie (`recordTemplateCopy`, `web/src/lib/contents/template-copies.ts`) pour la colonne « État » et « Non utilisés » des Modèles de bloc.
- `template_id`, `content_id` (clé des deux, chacun → `contents` `cascade`, différents), `copied_at` ; la première copie compte.
- L'équipe lit et insère (`template_id`, `content_id`) pour un modèle `style` ou `starter` et un contenu existant ; personne ne modifie. Un bloc partagé reste lié (`draft_template_ids`).

---

## 2. Format des blocs

> **En bref** : un contenu est une liste de blocs (Texte, Image, Encadré), décrits dans un seul fichier d'où l'on tire les vérifications de l'admin, de l'app et de la base. Ajouter un bloc revient à compléter ce fichier et à écrire son affichage.

### 2.1 Une seule description, vérifiée à trois endroits

- **Source** : `blocks/blocks.schema.json`, draft-07 écrit à la main **[D7]** (règles d'écriture : `supabase/CLAUDE.md`, « Forme des blocs »).
- **Trois variantes**, mêmes `definitions` : `draft` (image sans fichier permise, `linked` au premier niveau) ; `template` (pas de `linked` : ni chaîne ni boucle) ; `published` (fichier obligatoire, `alt` résolu, marqueur `altFromLibrary`, pas de `linked`).
- **`cd web && npm run blocks:generate`** (`web/scripts/blocks-generate.mjs` ; `ajv`, `json-schema-to-typescript`, `esbuild`) **[D8]** produit :
  1. `blocks/generated/<variante>.schema.json` et `schema.sha256` ;
  2. dans `web/src/blocks/generated/` : types (`blocks.ts`), variables CSS (`tokens.css`), validateurs Ajv « standalone » (`validators.js` et `.d.ts` : `validateDraft`, `validateTemplate`, `validateBlock`, `validatePublished`, `validatePublishedBlock`) en un fichier ESM **autonome** (esbuild y inclut `ucs2length`, `equal`…), sans `new Function` ni `eval` (Hermes ; vérifié par le script) ;
  3. `supabase/tests/aides/blocs-cas.inc`, les cas de `blocks/cases/` (aussi vérifiés par les validateurs) ;
  4. si le schéma change, une migration `…_schema_blocs.sql` (ligne `-- blocks-schema-sha256:`) qui recrée `private.blocks_schema(variant)` et `private.blocks_schema_hash()`.
  Avec l'app : types et validateurs dans `mobile/src/blocks/generated/` (sans `ajv`), à vérifier sous Hermes.
- **Base** : `jsonschema_validation_errors(private.blocks_schema(…), …)` (pg_jsonschema 0.3.3, sans variantes « compilées », absentes en 0.3.3) dans le déclencheur du brouillon et la publication, avec une erreur lisible. `$ref` récursifs appliqués (`30_blocs_schema.test.sql` : 6 et 25 niveaux) ; `oneOf`/`anyOf`/`allOf` exponentiels, sans interruption par `statement_timeout` ; au-delà d'environ 29 niveaux de listes, `brouillon_trop_imbrique`.
- **Admin** : validateur avant chaque enregistrement. **App** : validera chaque bloc reçu ; invalide ou inconnu, il devient l'encart « Mets à jour l'app pour voir ce passage ».
- **Garde-fous** : « Administration » relance `blocks:generate` puis `git diff --exit-code` ; « Base de données » compare `private.blocks_schema_hash()` à `schema.sha256`.

### 2.2 Forme d'un brouillon

```json
{
  "v": 1,
  "title": "Premier article",
  "cover": { "mediaId": "c0de…" },
  "audio": null,
  "blocks": [
    { "id": "3f2c…", "type": "text", "doc": { "type": "doc", "content": [ … ] } },
    { "id": "8a91…", "type": "image", "mediaId": "c0de…", "caption": "…", "alt": null },
    { "id": "b7e4…", "type": "box", "look": "fill",
      "blocks": [ { "id": "…", "type": "text", "doc": { … } } ] },
    { "id": "d1a0…", "type": "linked", "templateId": "9e7f…" }
  ]
}
```

- Racine : `v: 1`, `title` (200 au plus, vide permis), `blocks`, et facultatifs `cover`, `audio` (`null` ou `{ mediaId }`), rien d'autre.
- **`id`** : UUID minuscule (`crypto.randomUUID()`), fixe même au déplacement ; un déclencheur refuse un doublon, encadrés compris.
- Toute référence à un fichier est une clé **`mediaId`** (`cover`, `audio` compris), à un modèle une clé **`templateId`** : `jsonb_path_query(draft, 'strict $.**.mediaId')` trouve tout, blocs futurs compris **[D9]**.
- **`v`** n'augmente que pour un changement cassant, avec migration des brouillons et des versions.

### 2.3 Les trois blocs de départ

- **Texte** (`text`) : `doc`, JSON ProseMirror **restreint** (`additionalProperties: false`) :
  - nœuds : `doc` (`content` non vide), `paragraph`, `heading` (`level` 2 ou 3), `bulletList`, `orderedList` (`attrs` absent ou `{ start }`, 1 à 99 999), `listItem` (un `paragraph` d'abord, puis paragraphes et listes : **pas de titre dans une liste**), `hardBreak`, `text` (non vide) ; `paragraph` et `heading` sans `content` permis ;
  - marques : `bold`, `italic`, `link` (`attrs: { href }` seul, `https://` ou `mailto:`, sensible à la casse, sans espace) **[D10]**.
  - Admin (`web/src/blocks/text/extensions.ts`) : `StarterKit` sans `blockquote`, `code`, `codeBlock`, `horizontalRule`, `strike`, `underline`, `trailingNode`, `link`, `orderedList`, `listItem`, avec `heading: { levels: [2, 3] }` ; `Link.extend` (`href`, `isAllowedUri`), `OrderedList.extend` (`start`), `ListItem.extend` (`content: "paragraph (paragraph | bulletList | orderedList)*"`). `cleanTextDoc()` reste un filet (titres ramenés et sortis des listes, `start` borné, inconnus et texte vide retirés, au moins un paragraphe).
- **Image** (`image`) : `mediaId` (`null` permis au brouillon), `caption` (texte simple, 300 points de code, ou `null` ; toujours `null`, ni écrite ni affichée **[D34]**), `alt` (1 000 au plus ; `null` = celui de la médiathèque). Une photo prend toute la largeur ; un SVG garde sa taille (`media.width`) sans dépasser, centré, sans coins arrondis (l'app aussi).
- **Encadré** (`box`) : `look` `fill` ou `border` ; `blocks` de `text` et `image` seulement (vide permis) : ni encadré ni bloc lié dedans. Vide, il ne s'affiche ni en Lecture ni dans l'app ; l'éditeur le signale sans bloquer la publication.
- **Lié** (`linked`) : `{ id, type: "linked", templateId }`, au premier niveau d'un contenu (§ 2.5).

### 2.4 Dans une version publiée

- Chaque `linked` devient une **copie** du bloc du modèle : même `id` que le bloc lié, nouveaux `id` dedans (uniques même si le modèle revient), marqueur `"templateId"`.
- Chaque `alt: null` reçoit le texte de la médiathèque (ou `""`) et `"altFromLibrary": true`, qui permet à « Revenir à cette version » de remettre `null` ; l'app l'ignore.
- `files` fige les informations des fichiers. L'app ne voit que `text`, `image` et `box`.

**Textes du fichier figés** **[D30]** : corriger un texte alternatif ou une transcription change aussitôt les brouillons, l'app seulement à la publication suivante. La fiche du fichier le dit et propose « Mettre à jour ces N contenus dans l'app » (`media_push`) : une version égale à celle en ligne, sauf ces textes (`origin = 'files'`, comme `template_push`), mise en ligne ; le reste du brouillon ne part pas.

### 2.5 Modèles de blocs

Des lignes `kind = 'template'` de `contents` (même éditeur, verrou, corbeille, enregistrement), jamais publiées.

| Sorte (ADMIN § 5) | Insertion | Modifier le modèle | Suppression |
|---|---|---|---|
| `style` (mise en forme) | copie, nouveaux `id` | sans effet ailleurs | libre (corbeille) |
| `starter` (point de départ) | le contenu s'ouvre avec une copie | sans effet ailleurs | libre (corbeille) |
| `shared` (bloc partagé) | un bloc `linked` | **tous les brouillons le voient aussitôt** | refusée tant qu'un brouillon le cite |

- `shared` : **exactement un bloc** **[D11]** (plusieurs : un Encadré). `starter` : une sorte (`template_for`) **[D42]**. La sorte ne change pas (déclencheur). Deux modèles n'ont pas le même nom (§ 1.6, `…_noms_des_modeles.sql`). Copies notées dans `template_copies` (§ 1.12).

### 2.6 Ajouter un bloc (SVG, animation Lottie, PDF…)

1. Sa définition dans le schéma, avec son `mediaId` (par exemple `svg` : `mediaId`, `alt` ; `animation` : `mediaId`, `loop`, `autoplay` ; `pdf` : `mediaId`, `label`). On ne fait **qu'ajouter** : les lignes existantes ne sont pas revérifiées.
2. `blocks:generate`.
3. Admin : `web/src/blocks/registry.ts` (`type`, libellé, icône, `create()`, `allowedInBox`), `BlockBody` de `web/src/blocks/components/block-canvas.tsx`, `web/src/components/editor/block-settings.tsx`.
4. App : `mobile/src/blocks/registry.tsx`.
5. Tests : cas partagés (`blocks/cases/*.json`) pour Vitest et pgTAP, et le rendu.

Une ancienne app affiche « Mets à jour l'app » ; `versions.block_types` permet de prévenir avant de publier un bloc récent.

### 2.7 Affichage dans l'admin

- **On écrit dans l'aperçu** (ADMIN § 4) : téléphone au centre (`feed-preview.tsx`, `BlockCanvas`), plan à gauche (`OutlinePanel`, les Blocs en glissière), colonne du contenu à droite (`article-panel.tsx`) et réglages du bloc par-dessus. Un bloc Texte est une instance Tiptap (`text-block.tsx` : `immediatelyRender: false`, `shouldRerenderOnTransaction: false` ; `useEditorState` dans `format-toolbar.tsx`), figée sans le verrou ou en Lecture. Le détail des écrans : `web/CLAUDE.md`, « Éditeur des contenus ».
- **Fidélité** : `blocks/blocks.tokens.json` donne les variables CSS de l'aperçu et donnera les constantes de l'app **[D12]**.
- **Glisser-déposer** (dnd-kit), **dans le plan seulement**, depuis une poignée (`useSortableItem`, `PointerSensor` `distance: 5`) : `useBlockDrag` (`web/src/blocks/components/use-block-drag.ts`), un `SortableContext` pour la liste et un par encadré, chacun dans une zone de dépôt ; règles et cibles dans `web/src/blocks/dnd.ts` (ni `box` ni `linked` dans un encadré) ; `DragOverlay`, `KeyboardSensor`, annonces `texts.editor.dnd`. Au clavier : `shiftBlock`, `canShift` (`web/src/blocks/draft.ts`). Un bloc des Blocs se glisse aussi dans le téléphone (`web/src/lib/editor/library-drag.ts`).
- **Bloc partagé** : rendu sans Tiptap (`web/src/blocks/components/static-block.tsx`), avec « Modifier le modèle » et « Détacher du modèle ».
- Les SVG ne s'affichent qu'en `<img>`, qui n'exécute aucun script.

---

## 3. Règles tenues par la base, fonctions et tâches planifiées

> **En bref** : la base refuse elle-même ce qui est interdit : écrire sans double vérification, écrire un brouillon tenu par un autre, publier un bloc mal formé, supprimer un fichier ou un modèle utilisé, modifier une version. Les gestes sont des fonctions de la base ; l'interface les appelle.

### 3.1 Droits (RLS)

| Table | Lecture | Écriture directe | Le reste |
|---|---|---|---|
| `contents`, `versions` | `is_staff()` | **aucune** | RPC |
| `edit_locks` | `is_staff()` | aucune | `lock_*` |
| `media` | `is_staff()` | `update (name, alt, transcript)`, hors corbeille ; textes nettoyés (bords, vide → `null`) | RPC ; `status`, `is_public`, effacement : fonction Edge |
| `categories` | `is_staff()` | `is_staff()` (§ 1.5) | `categories_reorder` |
| `content_categories` | `is_staff()` | aucune | `save_draft` |
| `access_levels` | `is_staff()` | `is_admin()` | `access_levels_reorder` |
| `reader_access` | sa propre ligne | clé secrète seulement | |
| `media_audit` | `is_staff()` | aucune | fonction Edge, tâche `audit-fichiers` |
| `template_copies` | `is_staff()` | `insert (template_id, content_id)` (§ 1.12) | |

`anon` et un éditeur en aal1 n'ont **aucun droit**.

**Compte sans fiche d'équipe.** Tout repose sur `is_staff()`, donc sur une fiche `profiles`. `private.handle_new_user()` n'en crée une que si le rôle a été posé dans `app_metadata` par la clé secrète (invitation par `equipe`, ou premier admin à la main) : tout autre compte, lecteur compris, a `is_staff()` faux même en aal2 (`10_equipe.test.sql`).

### 3.2 Triggers et fonctions internes

- **Brouillon** (`contents_30_draft`, `before insert or update of draft`) :
  1. vérifie la forme (variante `template` pour un modèle, `draft` sinon) : `forme_invalide`, `brouillon_trop_lourd`, `brouillon_trop_imbrique` ;
  2. vérifie l'unicité des `id` (`id_en_double`) ;
  3. recalcule `draft_media_ids` et `draft_template_ids` ;
  4. verrouille les `media` cités (`for share`), puis refuse un fichier inconnu, pas `ready` ou à la corbeille (`fichier_indisponible`) et un modèle inconnu, à la corbeille ou pas `shared` (`modele_indisponible`) ; ce verrou empêche la mise à la corbeille simultanée du fichier (`media_trash` prend `for update`) ;
  5. modèle `shared` : un bloc au plus (`modele_un_seul_bloc` ; il naît vide), gardé tant qu'il est cité (`modele_utilise`) ; un bloc lié **ajouté** ne cite pas un modèle vide (`modele_vide`) **[D11]**.
- **`contents_10_kind`** : `id`, `kind`, `template_sort`, `template_for` immuables (`sorte_immuable`). `contents_05_list_position` place un neuf.
- **Garde de corbeille** (`contents_20_trash_guard`) : un contenu à la corbeille ne change pas (`dans_la_corbeille`), sauf, colonne par colonne :
  1. `restore` (`deleted_at` vidé) ;
  2. une colonne d'auteur passée à `null`, le reste identique (retrait d'un membre) ;
  3. `template_detach_all` (§ 3.5) et `media_replace` (§ 1.9), qui ne changent que `draft`, `draft_rev`, `draft_media_ids`, `draft_template_ids`, `draft_saved_at`, `draft_saved_by`, et posent `set_config('ruche.detach_all', 'on', true)` (seul le code de la base le peut).
- **`versions`** : `versions_immutable`, `versions_no_truncate` (§ 1.7).
- **`media`** : `before delete` refuse si `media_uses` n'est pas vide (seconde défense). **`access_levels`** : `before delete` refuse une formule utilisée.
- **`private.live`** (vue interne) : les versions en ligne (`content_id`, `kind`, `version_id`, `level_id`, `level_rank`, `null` = gratuit) des articles, épisodes et pages hors corbeille à `live_version_id` rempli. Fichiers, lectures de l'app, usages et mises à jour s'appuient sur elle.

### 3.3 Enregistrement automatique et verrou

**Base** (signatures et réponses : « Étape 4 »)
- `lock_take(content_id, force, editor_session)` réussit si le verrou est libre, périmé, à soi, ou avec `force` (« Reprendre la main », confirmé) ; sinon nomme la personne. `editor_session`, tirée à chaque ouverture, accompagne toutes les RPC du verrou et `save_draft` : le verrou est tenu par un membre **et** une ouverture.
- `lock_heartbeat` toutes les 20 s, `lock_release` en quittant (`fetch(…, { keepalive: true })`), sinon expiration à **90 s** (`private.lock_ttl()`) **[D13]** ; `lock_status` pour le repli.
- `save_draft(content_id, base_rev, draft, settings, editor_session)` exige le verrou de cette ouverture (`verrou_perdu`) et `base_rev = draft_rev` (`conflit_revision`), refuse la corbeille, un titre pris, l'adresse d'une autre page (`adresse_prise`) ; écrit, augmente `draft_rev`, le recopie dans `edit_locks` (signe de vie). **Tous les réglages passent par là**, sous le verrou ; aucun ne change l'app avant la publication.

**Admin** (`web/src/lib/editor/autosave.ts`, `edit-lock.ts` ; `useAutosave`, `useEditLock`)
- Enregistrement 1,5 s après la dernière frappe, 10 s au plus après la première ; une requête à la fois. Hors ligne : 2, 4, 8, 15 puis 30 s, et dès le retour.
- Refus au-delà de 240 000 octets compacts, avertissement dès 200 000 (`web/src/blocks/draft.ts`). Avertissement avant de quitter un changement non enregistré ; la dernière révision connue est gardée par TanStack Query.
- **Signe de vie** toutes les 20 s **et** au retour sur l'onglet (`visibilitychange`) : Chrome ralentit un onglet caché à environ une minuterie par minute, ce que 90 s supporte. Caché 30 minutes, l'onglet relâche ; au retour, il reprend ou passe en lecture seule.
- **Realtime** sur `edit_locks` seulement, jamais `contents` **[D13]**, `INSERT` et `UPDATE` filtrés par contenu (Postgres Changes ne filtre pas les `DELETE`, d'où la libération en `UPDATE`) : le lecteur voit qui écrit, recharge quand `draft_rev` change, peut prendre la main quand `holder_id` se vide ; celui qui perd la main passe en lecture seule, son texte non enregistré gardé (« Copier mon texte ») ; sans Realtime, `lock_status` toutes les 30 s. La base tranche (`verrou_perdu`).
- En **Lecture**, l'éditeur suit le verrou sans le prendre (`web/CLAUDE.md`). Pas de Presence (hors base, il ne peut pas tenir le verrou). Un contenu programmé a un bandeau permanent (§ 3.8).

### 3.4 Publication

- **`publish(content_id, expected_rev)`** → `private.do_publish(content_id, auth.uid(), 'manual', expected_rev)`, qui :
  0. refuse un modèle (`sorte_invalide`) et un niveau jamais choisi (`acces_a_choisir`) **[D41]** ;
  1. refuse si un **autre** membre tient un verrou actif (`verrou_tenu`, nom dans `hint` ; « Reprendre la main ») **[D14]** ;
  2. refuse si `draft_rev <> expected_rev` (`conflit_revision`) ;
  3. page : exige un `slug` (`adresse_manquante`) libre parmi les pages **en ligne** (`adresse_prise`) ;
  4. prépare la version (`private.prepare_version`) : résout blocs partagés (`modele_indisponible`) et textes alternatifs ; vérifie la sorte (`private.check_publish_requirements` : `titre_manquant` **[D49]**, `image_de_presentation_manquante` pour un article ou un épisode **[D45]**, `son_manquant` pour un épisode) ; verrouille (`for share`) et vérifie les fichiers (`fichier_indisponible` ; `fichier_inadapte` : pas une image en bloc Image ou en image mise en avant, pas un audio en son ; `image_sans_fichier`) ; fige `files`, `slug`, nom de la formule ; valide en `published` (`forme_invalide`, `brouillon_trop_imbrique`) ;
  5. écrit la version (`private.insert_version`), met `live_version_id`, `first_published_at` la première fois, vide `scheduled_at` et `schedule_error`.
  Renvoie `needs_file_sync` : l'admin appelle alors `files`.
- Ni texte alternatif **[D15]** ni transcription **[D46]** exigés.
- **`unpublish`** (« Retirer de l'app ») : `live_version_id = null`, programmation et échec effacés, historique gardé ; `needs_file_sync` ; refuse un modèle.
- **`schedule(content_id, at)`**, **`unschedule`** : article, épisode, page ; `at > now()` (`date_passee`). `schedule` vérifie déjà les exigences de la publication sur le brouillon enregistré et note `scheduled_by`, `scheduled_rev = draft_rev`. L'admin convertit l'heure du fuseau en instant (`zoneToInstant`) ; la base compare à `now()`. Publie **le dernier brouillon enregistré à l'heure dite** **[D16]**, sauf écriture en cours **[D31]** (§ 3.8), ce que rappellent la barre de publication et le bandeau.
- **`revert_to_version(version_id, editor_session)`** : exige le verrou (`verrou_perdu`) ; recopie `body`, niveau, `slug` et catégories encore existantes, puis :
  - refait un `linked` de chaque copie `templateId` dont le modèle `shared` existe hors corbeille avec un bloc, sinon en fait une copie ordinaire (`modele_detache`) ;
  - met à `null` le `mediaId` d'un fichier absent, à la corbeille ou pas `ready` ([D6]) ; le bloc dit « Fichier supprimé, choisis-en un autre », la publication le refuse (`fichier_retire`) ;
  - remet `alt: null` là où était `altFromLibrary`, et retire le marqueur ;
  - formule supprimée : niveau à rechoisir (`access_chosen = false`, `formule_supprimee`) ;
  - garde l'adresse du brouillon si celle de la version est prise (`adresse_prise`), renomme un titre repris (`titre_renomme`).
  Augmente `draft_rev`, ne publie rien.

### 3.5 Modèles

- **`content_create(kind, title, template_sort, from_template_id, template_for)`** : verrou tenu aussitôt ; d'un point de départ **de la même sorte** ([D42]), copie ses blocs avec de nouveaux `id`.
- **`template_create_from(content_id, block_ids[], name, sort, template_for)`** : « Enregistrer comme modèle », depuis les blocs de premier niveau du brouillon enregistré.
- **`template_outdated(template_id)`** : les contenus **en ligne** dont une copie `templateId`, **encore liée dans le brouillon** (même `id`), diffère du modèle (sans les `id` ni les textes figés) ; un bloc détaché exprès n'est pas proposé. D'où « Mettre à jour ces N contenus dans l'app ».
- **`template_push(template_id)`** : pour chacun, une version = **la version en ligne** dont seules ces copies changent (`origin = 'template'`, auteur = qui clique), mise en ligne ; rien d'autre du brouillon.
- **Détacher** : dans l'éditeur, le `linked` devient une copie ordinaire (même `id`, nouveaux `id` dedans), par `save_draft`. **`template_detach_all`** (« Détacher partout ») : dans tous les brouillons, corbeille comprise (§ 3.2) ; refuse si l'un est écrit par un autre (`verrou_tenu`) ; l'éditeur de l'appelant se recharge s'il est concerné ; le modèle devient supprimable.

### 3.6 Corbeille

- Vue **`trash_items`** (`security_invoker = true`) : `item_type` (`content`, `file`), `id`, `kind`, `title`, `deleted_at`, `deleted_by_name`, `purge_at = deleted_at + 30 jours`, `purge_error` ; sans les fichiers dont l'effacement est demandé. Filtre par type : `web/src/lib/trash.ts`.
- **`trash(content_id)`** : retire de l'app, annule la programmation, libère le verrou, pose `deleted_at` ; `needs_file_sync`. Refuse si un autre écrit (`verrou_tenu`) et un bloc partagé cité (`modele_utilise`). Chaque contenu part et revient seul ; son titre est libéré.
- **`restore`** : retour **en brouillon, sans republier** **[D18]** ; adresse reprise : sans adresse (`adresse_retiree`) ; titre repris : renommé (`titre_renomme`).
- **`media_trash(id)`** : `for update`, puis `fichier_utilise` si `media_uses` n'est pas vide ; avec le `for share` du déclencheur et de `publish`, pas de course avec une insertion (`40_corbeille_concurrence.test.sql`). **`media_restore`** : refuse un effacement demandé.
- **`empty_trash(items jsonb default null)`** : la sélection (`[{ "type": "file" | "content", "id": "…" }]`) ou tout (`null`) ; admin et éditeur. Contenus effacés aussitôt (cascade), seulement s'ils sont dans la corbeille ; fichiers : effacement demandé. L'admin envoie **toujours la liste affichée**, même pour « Vider la corbeille » (rien d'effacé sans avoir été vu), puis appelle `files` sans attendre.
- **`private.purge_trash()`** : après 30 jours, contenus et modèles en SQL (cascade : versions, catégories, copies, verrous) ; pour les fichiers, `purge_requested_at` seulement (Supabase bloque un `DELETE` sur `storage.objects` : la fonction Edge efface par l'API).

### 3.7 Une seule fonction Edge : `files`

Clé secrète **injectée par la plateforme** (`SUPABASE_SECRET_KEYS`, repli `SUPABASE_SERVICE_ROLE_KEY`), lots de 50, **idempotente** ; `verify_jwt = false`, aucun secret saisi. Deux appelants :
- **sans session de membre** (la tâche `fichiers`, `net.http_post` avec la clé **publishable** en `apikey`) : adresse et clé étant publiques, seul `kick` est permis, le **travail décidé par la base**, freiné en base (`files_claim_run` : un toutes les 20 s, sinon `429 trop_tot`) ;
- **un membre** (JWT en `Authorization: Bearer`, par `functions.invoke`) : `rpc('is_staff')` avec ce jeton, sinon `403` ; tous les modes, sans frein ; `clean` réservé (`401` sans membre). L'admin l'appelle après un envoi, une publication, un retrait, « Vider la corbeille » ou « Nettoyer ».

`rpc()` n'atteint pas `private` : la fonction passe par `public.files_*` (`service_role` seulement ; tests `supabase/tests/20_…`, `23_…`) : `files_claim_run(run_mode)` ; `files_worklist(max_items)` (dans l'ordre `check`, `move` d'après `private.files_to_move()`, `purge`, `discard`, 50 au plus, l'effacement d'un fichier utilisé écarté avant de toucher à l'objet) ; `files_mark_checked(media_id, accepted, reason)`, `files_mark_check_failed(media_id, error)`, `files_mark_moved(media_id, is_public)`, `files_mark_failed(media_id, error)`, `files_mark_erased(media_id)` ; `files_audit()`, `files_orphans()`.

Ses tâches :
1. **Vérifier** les `checking` (§ 4.3) : `ready` ou `rejected`.
2. **Déplacer** (`move(path, path, { destinationBucket })`), puis `is_public`.
3. **Effacer** ceux dont `deleted_at` et `purge_requested_at` sont remplis à la relecture (`remove()` dans les deux buckets, puis `files_mark_erased`). Un usage apparu entre-temps (trigger `before delete`) : elle n'insiste pas, la base note `purge_error`, vide `purge_requested_at`, et la Corbeille affiche « Effacement impossible : encore utilisé ».
4. **Nettoyer** `pending` et `rejected` de plus de 24 h (objet et ligne) ; `media_confirm` refuse au-delà de 23 h (`envoi_expire`).
5. **Contrôle hebdomadaire** : tâche `audit-fichiers`, en SQL (pas de mode `audit`), vers `media_audit`.
6. **Nettoyer les orphelins** (`clean`, un membre) : ceux du dernier contrôle, toujours sans ligne et de plus de 24 h.

Déplacer et effacer attendent le réseau, sans peser sur les 2 s de processeur ; un SVG de 5 Mo s'analyse en 0,3 à 0,7 s, donc 10 Mo de SVG et Lottie au plus par passage. Un échec n'est pas repris dans le passage, et revient après 10 minutes (`sync_failed_at`).

**Contrat pour l'interface** : `POST /functions/v1/files` avec `{ "mode": "kick" | "clean" }` (`kick` par défaut). `200` et un résumé (`kick` : `{ mode, checked, accepted, rejected, checkFailed, moved, erased, eraseRefused, failed, remaining }` ; `clean` : `{ mode, removed, orphans }`), sinon `{ error: { code, message } }` : `400 demande_invalide`, `401 non_connecte`, `403 reserve_a_l_equipe`, `405 methode_refusee`, `429 trop_tot`, `500 erreur_serveur`. `media.reject_reason` : `fichier_incoherent`, `fichier_trop_lourd`, `verification_impossible`, `svg_illisible`, `svg_element_interdit`, `svg_attribut_interdit`, `svg_lien_externe`, `lottie_illisible`, `lottie_invalide`, `lottie_lien_externe`.

### 3.8 Tâches planifiées (pg_cron)

Vercel Hobby ne lance ses tâches qu'une fois par jour : le fréquent se fait dans Supabase.

| Tâche | Fréquence | Action |
|---|---|---|
| `publications` | chaque minute | `private.run_due_publications()` : `scheduled_at <= now()`, `for update skip locked`, un bloc d'exception par contenu ; un retard (pause du projet) part au passage suivant |
| `fichiers` | chaque minute | `private.kick_files()` : appelle `files` **seulement s'il y a du travail** (fichiers `checking`, `files_to_move()` non vide, effacements demandés, envois abandonnés) |
| `corbeille` | chaque jour, 02:00 GMT | `private.purge_trash()` |
| `audit-fichiers` | dimanche, 03:00 GMT | `private.audit_files()` |
| `menage` | dimanche, 04:00 GMT | `private.housekeeping()` : `cron.job_run_details` > 14 jours, `net._http_response` > 7 jours, `media_audit` > 90 jours (sauf le dernier), `edit_locks` muets depuis un jour |

**Programmation pendant qu'on écrit** **[D31]**. Pour chaque contenu dû :
1. `scheduled_by` doit être dans `profiles`, sinon échec « auteur parti de l'équipe » ;
2. si un membre tient un verrou actif **et** que `draft_rev <> scheduled_rev`, on réessaie la minute suivante ; après une heure, échec « brouillon en cours d'écriture » ;
3. sinon `private.do_publish(content_id, scheduled_by, 'scheduled')`.
Un échec remplit `schedule_error` et vide `scheduled_at` (« Programmation échouée » ; codes : « Étape 5 »).

**Réglages** : adresse de `files` et clé publishable dans `private.settings` (avec l'heure des derniers passages pour le frein) : `supabase/CLAUDE.md`. En local, `http://kong:8000/functions/v1/files` : la passerelle par son nom Docker, joignable depuis Postgres sous macOS et Linux (pas `host.docker.internal` sur Linux). La requête pg_net ne part qu'après la validation de la transaction ; `npm run functions:integration` vérifie pg_cron → pg_net → `files`.

### 3.9 Contre la mise en pause du projet gratuit

`.github/workflows/garder-actif.yml` appelle chaque jour `public.ping()` sur la démo avec la clé publishable, une vraie requête qui n'écrit rien **[D19]** ; `ping()` est dans la liste fermée de `anon` (§ 4.5). Aucun secret ; seulement depuis `main` ; retiré au passage à Pro.

---

## 4. Fichiers : stockage et visibilité

> **En bref** : deux « tiroirs », public et protégé. Tout arrive dans le protégé ; un fichier passe dans le public quand un contenu gratuit publié l'utilise (ou en fait son image mise en avant), et revient au protégé sinon. Les abonnés reçoivent des liens temporaires.

### 4.1 Deux buckets

| Bucket | Accès | Limite | Types |
|---|---|---|---|
| `files-public` | public, sans jeton | 50 MiB | `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`, `application/json`, `audio/mpeg`, `audio/mp4`, `application/pdf` |
| `files-protected` | lien temporaire ou session | 50 MiB | les mêmes |

- Types en liste **exacte** **[D33]** ; GIF et HEIC sont convertis avant l'envoi (§ 4.2).
- Créés **par migration** (`insert into storage.buckets … on conflict (id) do update`), pas dans `config.toml` **[D20]**. Chemin `<media_id>/<nom-nettoyé>.<ext>`, le même dans les deux.
- Le bucket public `marque` (logos, image de connexion ; ADMIN § 1) ne sert pas aux contenus. Lottie en `.json` seulement (pas `.lottie`).

### 4.2 Envoi

1. **`media_create(kind, name, mime, size_bytes, width, height, duration_s)`** : ligne `pending` (`created_by = auth.uid()`) avec son chemin ; SVG et Lottie limités à 5 Mo.
2. **Préparation** (`web/src/lib/media/prepare.ts`, sans bibliothèque) : format reconnu aux premiers octets, puis à l'extension et au type ; photos réduites vers 300 Ko (`createImageBitmap` orienté, canvas, WebP, ou JPEG sur fond blanc si le navigateur ne rend pas le WebP ; 2 000 px au plus, jamais sous 800 px ; qualité puis taille) ; PNG ou WebP déjà léger tel quel ; GIF converti (première image, avertissement s'il est animé) ; HEIC converti si le navigateur le lit (Safari 17+), sinon message « enregistre-le en JPEG » ; SVG nettoyés et Lottie vérifiés (§ 4.3) ; type audio normalisé ; dimensions et durée lues.
3. **Envoi dans `files-protected`**, `cacheControl: '60'` **[D21]**, sans `upsert` : standard jusqu'à 6 Mo, TUS au-delà (`tus-js-client` 4.3.1). storage-js **ignore** `contentType` pour un `Blob` : l'admin envoie un `Blob` du type normalisé. Standard : `XMLHttpRequest` (progression, annulation **[D40]**), même requête que storage-js (`POST /storage/v1/object/files-protected/<chemin>`, `content-type`, `cache-control: max-age=60`, `x-upsert: false`). TUS : `https://<réf>.storage.supabase.co/storage/v1/upload/resumable` (dans `connect-src` de `web/csp.ts`), morceaux de 6 Mo, empreinte propre au chemin, jeton relu à chaque requête. Annuler arrête l'envoi ; la ligne `pending` part à la corbeille, effacement demandé.
4. **`media_confirm(id)`** : l'objet existe dans `storage.objects` (sinon `fichier_absent`, réessayable), taille et type concordent (sinon `rejected`, `fichier_incoherent`), puis `ready` (image, audio, PDF) ou `checking` (SVG, Lottie) ; rejouable. L'admin appelle aussitôt `files`.

**Politiques de `storage.objects`** : `INSERT` sur `files-protected` `to authenticated` si `(select public.is_staff())` **et** `name` est **exactement** le `path` d'une ligne `pending` **créée par la même personne** ; ni `UPDATE`, ni `DELETE`, ni écriture sur `files-public` (seule la fonction Edge déplace et efface) ; `SELECT` : § 4.5.

### 4.3 Vérification côté serveur des SVG et des Lottie

La base ne croit pas le navigateur : un fichier `checking` n'entre dans aucun bloc avant `ready`, et seule la fonction Edge change `status` **[D25]**.
- **SVG** : **refus**, sans réécriture, de ce qui exécute du code ou charge une ressource extérieure, par analyse XML (`@xmldom/xmldom` 0.9.12) et **liste blanche** d'éléments SVG (formes, texte, dégradés, masques, `fe*`, `use`, `image`, `style`, `title`, `desc`, `metadata`…). Refusés : `script`, `foreignObject`, `iframe`, `embed`, `object`, `a`, `animate`, `set`…, tout autre espace de noms, un attribut `on…`, `javascript:` (références de caractères décodées), un `href` / `xlink:href` ni local (`#…`) ni, sur `image` et `feImage`, `data:image/(png|jpeg|webp);base64` ; dans le CSS, `url()` non local, `@import`, `image-set()`, `-webkit-image-set()`, `image()`, `cross-fade()`, `element()`, `src()`, toute chaîne en forme d'adresse (`https:…`, `//…`, `data:…`) ; `<?xml-stylesheet?>` ; un DOCTYPE à déclarations. **Encodage** : UTF-8 strict ; servi sans `charset`, le SVG est lu selon `<?xml encoding?>` : refus d'un autre encodage déclaré (ISO-2022-JP ferait lire autre chose), d'une déclaration hors du début, des caractères hors XML 1.0 (C0, U+FFFE, U+FFFF). Raisons : `svg_illisible`, `svg_element_interdit`, `svg_attribut_interdit`, `svg_lien_externe`.
- **Nettoyage de l'admin** (`web/src/lib/media/svg.ts`, mêmes règles) : prologue retiré, DOCTYPE simple retiré (à déclarations : refusé) ; DOMPurify (`USE_PROFILES: { svg: true, svgFilters: true }`, `ADD_TAGS: ["use"]`, `FORBID_TAGS: ["a"]`, hook `uponSanitizeAttribute` pour `href` et `style`), car son seul profil SVG laisserait passer `@import`, `<image href="https://…">`, `fill:url(https://…)` ; second passage contre ce que le serveur refuserait encore (y compris un `<style>` avec `@font-face` ou un échappement CSS) ; `XMLSerializer` ; puis vérification aux règles de `files` (un SVG irrécupérable, ou à caractères de contrôle, est refusé avant l'envoi). Un `<style>` sans adresse extérieure est **gardé** (couleurs d'Illustrator, `.st0 { fill: … }`), un douteux retiré en entier **[D40]**. Tests : `web/src/lib/media/svg.test.ts` compare les fixtures de `supabase/functions/files/fixtures/` nettoyées à `svg-nettoyes/`, que le test Deno fait accepter ; `web/e2e/mediatheque.spec.ts` envoie le fichier piégé, qui passe à `ready`.
- **Lottie** (spécification 1.0.1) : objet avec `layers` non vide, `w` et `h` (1 à 8192), `fr` > 0, `ip` et `op` (`op > ip`) ; `v` ou `ver` (≥ 10000) acceptés sans être exigés. Refus d'un asset autre qu'une image intégrée (`e = 1`, `p` en `data:image/(png|jpeg|webp);base64`) et d'une police par adresse (`fPath`, `origin` ≠ 0) : `lottie_illisible`, `lottie_invalide`, `lottie_lien_externe`. Les « expressions » passent : l'app ne les exécute pas.
- **5 Mo au plus** **[D39]** (256 Mo de mémoire, 2 s de processeur). Chaque vérification ratée augmente `check_attempts` ; à la troisième, `rejected` (« Vérification impossible »). Un refusé, raison affichée, est nettoyé après 24 h.

### 4.4 La règle « public ou protégé »

- **[D24]** Un fichier est public **si et seulement s'il** est dans `media_ids` d'une version de `private.live` gratuite, **ou** le `cover_media_id` d'une version de `private.live` de tout niveau (l'image mise en avant sert de vitrine, ADMIN § 6).
- **`private.files_to_move()`** compare cette règle à `media.is_public` en une requête, lue via `files_worklist()` : aucune colonne « voulue ».
- Un contenu republié en réservé rend ses fichiers protégés, sauf ceux qu'un autre contenu gratuit en ligne garde publics. L'image mise en avant d'un réservé reste publique tant qu'il est en ligne ; retiré ou à la corbeille, elle redevient protégée si rien d'autre ne la rend publique.

### 4.5 Qui peut lire un fichier protégé

Deux politiques `SELECT` sur `files-protected` : `to authenticated using ((select public.is_staff()))` (l'équipe) et `to anon, authenticated using (private.reader_can_open(name))` (les lecteurs).

`private.reader_can_open(object_name)` (`security definer`, `stable`) lit l'`id` dans le premier dossier (faux sans forme d'UUID) et cherche une version de `private.live` qui cite le fichier et qui est gratuite, **ou** d'un rang atteint par `reader_rank()`, **ou** dont il est l'image mise en avant. Le cas gratuit couvre la minute avant le déplacement.

**Droits sur `private`.** `anon` et `authenticated` ont `usage` sur `private` pour cette politique ; comme Postgres donne `EXECUTE` à `PUBLIC` sur toute fonction neuve, la migration de l'étape 3 pose, avant toute fonction de `private` :
- `alter default privileges for role postgres revoke execute on functions from public;` — **global** : une forme `in schema private` ne ferait qu'ajouter aux droits globaux. Dans `public`, Supabase donne l'`EXECUTE` par ses propres droits par défaut, retirés fonction par fonction ;
- `revoke execute on all functions in schema private from public, anon, authenticated;`
puis rend `execute` à `private.reader_can_open` seul. Liste fermée de `anon` dans `public` et son test `05_prive.test.sql` : `supabase/CLAUDE.md`.

L'app appelle `createSignedUrls(paths, durée)` avec sa session : la base décide, sans fonction Edge.

### 4.6 Cache et anciennes adresses

- Le CDN gratuit ne se vide pas : à **60 s** **[D21]**, un fichier redevenu protégé ou effacé reste joignable à son ancienne adresse 1 minute, plus 1 minute au plus avant son déplacement par la tâche `fichiers` si l'admin n'a pas appelé `files` : **2 minutes au pire** (ADMIN § 6). L'adresse publique renvoie `Cache-Control: max-age=60`. Le Smart CDN de Pro la ramène à environ 60 s.
- Un fichier ne se remplaçant jamais, un cache court ne ralentit pas l'app (cache par `id`).

---

## 5. Ce que lira l'app mobile

> **En bref** : l'app demandera « la liste des articles », « ce contenu », « cette page »… La base ne répond qu'avec ce qui est publié, et ne donne le réservé qu'aux abonnés du bon niveau. **Les lectures du § 5.1 existent** ; les §§ 5.2 à 5.4 décrivent ce que fera l'app, pas encore construite.

### 5.1 Les fonctions de lecture

RPC `security definer`, `stable`, `search_path` vide, pour `anon` et `authenticated`, qui ne lisent que `private.live` : `null` ou aucune ligne hors ligne.

| RPC | Renvoie |
|---|---|
| `app_feed(section, category_id = null, before = null, lim = 20)` | `{ items, nextCursor }` : articles (`blog`) ou épisodes (`podcasts`) en ligne, dans l'ordre de la section (`list_position` puis `id`, **[D47]**), 1 à 50. Élément : `{ id, versionId, kind, title, cover, files, categoryIds, level, locked, durationS, publishedAt, firstPublishedAt }` ; `files` : l'image mise en avant seule ; `durationS` : le son d'un épisode ; jamais de blocs ni de son. `category_id` filtre sur la version en ligne. `nextCursor` (« place~id », opaque) va dans `before` ; `null` à la fin. |
| `app_content(content_id)` | `{ id, versionId, kind, title, cover, slug, level, locked, blockTypes, blocks, audio, files, categoryIds, publishedAt, firstPublishedAt }`. `level` : `{ id, name, rank }` ou `null`. `locked` : réservé et formule valide du lecteur trop basse ; alors `blocks` et `audio` à `null`, `files` réduit à l'image mise en avant. `files` : `mediaId → { kind, mime, path, alt, transcript, width, height, durationS }`, figés. `categoryIds` : celles qui existent, dans l'ordre. **Pas d'emplacement** : il change sans nouvelle version. |
| `app_page(slug)` | la page **en ligne** dont la version porte ce `slug`, forme d'`app_content` |
| `app_file_locations(media_ids uuid[])` | `{ media_id, location }` (`public`, `protected`), pour les fichiers visibles par l'appelant (cités par une version en ligne gratuite ou d'un rang qu'il atteint, ou image mise en avant en ligne) ; 500 au plus (`demande_invalide`) |
| `app_categories(section)` | `{ id, name }`, ordre de l'équipe ; section inconnue : `demande_invalide` |
| `app_access_levels()` | `{ id, name, rank }`, par rang |

Pas de lecture des méthodes avant leur structure (§ 1.8). `versionId` sert de clé de cache à `app_content` ; `app_file_locations` ne se garde qu'une minute.

### 5.2 Fichiers

- L'emplacement change sans nouvelle version (F sert à l'article gratuit A et au réservé B ; A retiré, F redevient protégé, B ne change pas) : d'où `app_file_locations`, à part, gardé une minute.
- **Public** : `getPublicUrl`, sans réseau. **Protégé** : `createSignedUrls(paths, 3600)` pour images et PDF, 6 h pour un audio **[D22]**. En cas d'échec, l'autre emplacement, et `app_file_locations` invalidé.
- `expo-image` avec `cacheKey = mediaId`.

### 5.3 Affichage

- Registre `mobile/src/blocks/registry.tsx` et validateurs générés (§ 2.1).
- **Texte** : rendu maison récursif (une centaine de lignes) : `<Text>` imbriqués (gras, italique, liens par `expo-web-browser`), `<View>` pour les listes ; Tiptap ne tourne pas en natif et les bibliothèques sont peu suivies. **Image** : `expo-image`, place réservée. **Encadré** : `<View>` aux constantes de `blocks.tokens.json`.
- À venir, par `npx expo install` : `react-native-svg` 15.15.4 (plus fiable qu'`expo-image` sur iOS pour certains arcs), `lottie-react-native` ~7.3.8 (à vérifier par `npx expo-doctor`), `expo-audio`, PDF par `expo-web-browser`.

### 5.4 Lecteurs et paiement

- `reader_access` est provisoire ([D37], § 1.4) ; sa forme et son remplissage (par exemple une fonction Edge qui reçoit le paiement) viendront avec le paiement (ADMIN § 10).
- Les inscriptions sont fermées (ADMIN § 2) et les abonnés auront un compte : même projet ou ailleurs, question ouverte (§ 8.2). Dans le même projet, la sécurité de l'admin tient à la fiche sur invitation seulement (§ 3.1, § 6.0 point 1), en place depuis l'étape 2.

---

## 6. Plan de construction par étape (3 à 7) : migrations, écrans, tests

> **En bref** : l'admin s'est construite en cinq étapes. Ce chapitre garde les fondations (§ 6.0) et **le contrat de la base** de chaque étape (signatures, réponses, codes d'erreur) ; les règles sont aux §§ 1 à 5, le récit dans [le journal archivé](archives/journal-construction.md).

Toute RPC de l'admin exige un membre en aal2 (sinon `42501`, `reserve_a_l_equipe` ; `reserve_aux_admins` pour `access_levels_reorder`) ; le reste suit le § 1.1, rendu par PostgREST en `{ code, message, details, hint }`.

### 6.0 Ce qui doit exister dès l'étape 3

1. **Une fiche d'équipe seulement sur invitation** (§ 3.1, test pgTAP) ; premier admin créé à la main (ADMIN § 2).
2. Le schéma `private` et ses droits (§ 4.5), l'écriture des RPC et les erreurs (§ 1.1).
3. `pg_cron`, `pg_net`, `pg_jsonschema` ; pgTAP pour les tests.
4. Les deux buckets, le chemin, `cacheControl: '60'`, les politiques Storage (§ 4).
5. La fonction `files` et ses `public.files_*` (§ 3.7), `private.settings`, les tâches `fichiers`, `corbeille`, `audit-fichiers`, `menage` (§ 3.8).
6. Colonnes de corbeille, `trash_items` et page Corbeille générique **[D38]**.
7. La convention `mediaId`, `private.media_uses()`, `private.files_to_move()` (§ 1.9, § 4.4).
8. Des **aides pgTAP** pour cinq profils, anonyme, éditeur aal1, éditeur aal2, admin et **lecteur** (sans fiche, avec ou sans `reader_access`), par `request.jwt.claims` : `supabase/tests/aides/roles.inc` (usage : `supabase/CLAUDE.md`).
9. **Un test de droits par table** (modèle : `10_equipe.test.sql`) : pour chaque profil, `table_privs_are`, `column_privs_are`, lectures et écritures réelles, et `function_privs_are` pour chaque RPC.
10. **Types générés** : `npm run db:types` après chaque migration (ADMIN § 9).
11. **Tests sur GitHub** (ADMIN § 8) :

| Job (`garde-fous.yml` ; tous exigés par la règle de `main`, CLAUDE.md) | Ce qui tourne |
|---|---|
| « Administration » | `blocks:generate` sans changement (§ 2.1), Prettier, ESLint, code inutilisé, copier-coller, Vitest, types, construction |
| « Base de données » | `supabase db start`, pgTAP, empreinte du schéma des blocs, types générés à jour |
| « Fonctions serveur » | `npm run functions:test` (Deno), puis `npm run functions:integration` (Storage, passerelle, vrais envois, vrai passage de `fichiers`) |
| « Parcours » | Supabase local avec seed, Storage, Realtime, fonctions ; l'admin servie et Playwright ; comptes de test créés par les tests (`web/e2e/support/accounts.ts`, `roles.inc`) |

### Étape 3 : Médiathèque

Plan, réalisation et écarts : [journal archivé](archives/journal-construction.md), « Étape 3 ».

**Contrat de la base pour l'interface (partie `supabase/`)**

| RPC | Renvoie | Erreurs |
|---|---|---|
| `media_create(kind, name, mime, size_bytes, width?, height?, duration_s?)` | la ligne créée (`pending`, `path`) | `type_refuse`, `nom_invalide`, `fichier_vide`, `fichier_trop_lourd`, `fichier_invalide` |
| `media_confirm(media_id)` | la ligne (`ready`, `checking`, ou `rejected` / `fichier_incoherent`) ; rejouable | `fichier_introuvable`, `fichier_absent`, `envoi_expire` |
| `media_trash(media_id)` | la ligne, à la corbeille ; rejouable | `fichier_introuvable`, `fichier_utilise` (`hint` : les contenus) |
| `media_restore(media_id)` | la ligne ; rejouable | `fichier_introuvable`, `effacement_demande` |
| `empty_trash(items?)` | nombre d'éléments (§ 3.6) ; puis `files` | `demande_invalide` |
| `media_uses(media_id)` | `{ content_id, kind, title, in_draft, in_app }` (§ 1.9) | |
| `media_in_use(media)` | colonne calculée (§ 1.9) | |
| `media_storage_used()` | octets des deux buckets | |
| `media_outdated(media_id)` | `{ content_id, kind, title, version_id, version_number, published_at }` : contenus en ligne au texte figé différent ([D30]) | |
| `media_push(media_id)` | `{ content_id, version_id, version_number }` (§ 2.4) ; rejouable (0 ligne) | `fichier_introuvable` |
| `media_replace(old_id, new_id)` | `{ replaced, kept }` (`kept` : `id`, `title`, `holder`) **[D48]** | `demande_invalide`, `fichier_introuvable`, `fichier_pas_pret`, `type_different` |
| `media_replace_live(old_id, new_id)` | `{ content_id, version_id, version_number }` **[D48]** | celles de `media_replace` |

- **Lecture** : `media`, `media_audit` (`order by checked_at desc limit 1`), `trash_items`. **Écriture directe** : § 3.1.
- **Envoi** : `upload(path, new Blob([fichier], { type: mime }), { cacheControl: "60", upsert: false })` au chemin de `media_create` ; TUS avec les mêmes `bucketName`, `objectName`, `contentType`, `cacheControl` (§ 4.2).
- **`files`** : § 3.7 ; après un envoi, `trash` (si `needs_file_sync`), `empty_trash` ou « Nettoyer » : `kickFiles()`, puis relire.

### Étape 4 : Éditeur de blocs

Plan, réalisation et écarts : [journal archivé](archives/journal-construction.md), « Étape 4 ».

**Contrat de la base pour l'éditeur (étape 4)** (règles : § 3.3)

| RPC | Renvoie | Erreurs |
|---|---|---|
| `content_create(kind, title? = '', template_sort?, from_template_id?, template_for?)` | la ligne créée (un objet), verrou tenu ; brouillon `{ v: 1, title, cover: null, audio: null, blocks: [] }` ou copie du point de départ (nouveaux `id`) | `sorte_invalide` (sorte inconnue ; `template_sort` ou `template_for` manquant, en trop ou inconnu), `demande_invalide` (titre de plus de 200), `titre_pris`, `modele_indisponible` (point de départ absent, pas `starter`, à la corbeille ou d'une autre sorte) |
| `save_draft(content_id, base_rev, draft, settings?, editor_session?)` | `{ draft_rev, draft_saved_at }` (`.single()`). **Rejeu** : si `base_rev + 1` est la révision en base, écrite par l'appelant avec ce même brouillon, et les réglages déjà en place, renvoie cette révision au lieu de `conflit_revision` | `demande_invalide`, `contenu_introuvable`, `dans_la_corbeille`, `verrou_perdu`, `conflit_revision`, `reglages_invalides`, `titre_pris`, `niveau_invalide`, `adresse_invalide`, `adresse_prise`, `categorie_invalide`, et celles du brouillon |
| `lock_take(content_id, force? = false, editor_session?)` | `{ mine, holder_id, holder_name, taken_at, heartbeat_at, is_active, draft_rev }` (`.single()`) ; à soi depuis une autre ouverture : l'ancienne perd la main ; `holder_name` : nom, sinon e-mail | `contenu_introuvable`, `dans_la_corbeille` |
| `lock_heartbeat(content_id, editor_session?)` | `true` si le verrou est encore tenu par cette ouverture (même périmé, pas repris) ; `false` : lecture seule | |
| `lock_release(content_id, editor_session?)` | `true` si cette ouverture le tenait ; la ligne reste (`holder_id`, `holder_session`, `taken_at` à `null`) : un vieil onglet fermé ne retire pas la main au nouveau | |
| `lock_status(content_id, editor_session?)` | la ligne de `lock_take`, sans rien changer (toutes les 30 s, et après l'abonnement Realtime) | `contenu_introuvable` |
| `content_title_taken(kind, title, except_id?)` | `{ taken_id, taken_title }` (§ 1.6) ; vide sinon | |

- **Erreurs du brouillon** (§ 3.2 ; `save_draft`, `content_create`, `revert_to_version`) : `brouillon_trop_lourd` (262 144 octets **mesurés sur `jsonb::text`**, environ 8 % de plus que `JSON.stringify`, d'où la limite de 240 000 dans l'admin), `brouillon_trop_imbrique` (environ 29 niveaux), `forme_invalide` (`detail` : trois messages de pg_jsonschema sans chemin ; l'admin montre ceux de `validateDraft`), `id_en_double`, `fichier_indisponible`, `modele_indisponible`, `modele_vide`, `modele_un_seul_bloc`, `modele_utilise`.
- **`settings`** (clés facultatives ; absente, rien ne change ; autre : `reglages_invalides`) : `slug` (forme du § 1.6 ou `null` ; pages ; unique hors corbeille) ; `access_level_id` (`null` = Gratuit ou une formule ; `access_chosen` devient vrai ; article, épisode, page) ; `category_ids` (remplace la liste, `[]` pour aucune ; § 1.5).
- **Forme exigée par le schéma** (Tiptap, `cleanTextDoc`) : § 2.2 et § 2.3.
- **Lecture directe** : `contents`, `edit_locks`, `content_categories`, `categories`. **Écriture directe** : `categories` (§ 1.5).
- **Realtime** : `postgres_changes` sur `public.edit_locks`, `event: '*'` (en pratique `INSERT`, `UPDATE`), `filter: 'content_id=eq.<id>'` ; `payload.new` est la ligne entière, sans le nom (relu par `lock_status`) ; un `UPDATE` par signe de vie ; `DELETE` ignorés. `supabase.realtime.setAuth()` avant l'abonnement (le jeton aal2 n'est pas donné à Realtime après la double vérification), `lock_status` après `SUBSCRIBED`.

### Étape 5 : Publication

Plan, réalisation et écarts (parties n° 1 et n° 2, partie admin) : [journal archivé](archives/journal-construction.md), « Étape 5 ».

**Contrat de la base pour l'admin (étape 5, partie n° 1)** (règles : § 3.4)

| RPC | Renvoie | Erreurs |
|---|---|---|
| `publish(content_id, expected_rev)` | `{ version_id, version_number, published_at, needs_file_sync }` (`.single()`) ; `expected_rev` : la révision tout juste enregistrée | `demande_invalide`, `contenu_introuvable`, `dans_la_corbeille`, puis, dans l'ordre du § 3.4 : `sorte_invalide`, `acces_a_choisir`, `verrou_tenu`, `conflit_revision`, `adresse_manquante`, `adresse_prise`, `modele_indisponible`, `titre_manquant`, `image_de_presentation_manquante`, `son_manquant`, `fichier_indisponible`, `fichier_inadapte`, `image_sans_fichier`, `forme_invalide`, `brouillon_trop_imbrique` |
| `unpublish(content_id)` | `needs_file_sync` ; rejouable | `contenu_introuvable`, `sorte_invalide`, `dans_la_corbeille` |
| `schedule(content_id, at)` | l'instant enregistré ; remplace une programmation, efface `schedule_error` | `demande_invalide`, `contenu_introuvable`, `dans_la_corbeille`, `sorte_invalide`, `acces_a_choisir`, `adresse_manquante`, `date_passee`, `titre_manquant`, `image_de_presentation_manquante`, `son_manquant` |
| `unschedule(content_id)` | vrai si quelque chose a été effacé ; rejouable | `contenu_introuvable`, `dans_la_corbeille` |
| `revert_to_version(version_id, editor_session?)` | `{ draft_rev, draft_saved_at, warnings }` ; `warnings` ⊂ `titre_renomme`, `fichier_retire`, `modele_detache`, `formule_supprimee`, `adresse_prise` | `version_introuvable`, `dans_la_corbeille`, `verrou_perdu`, `titre_pris`, `adresse_prise`, celles du brouillon |
| `access_levels_reorder(ids uuid[])` | les formules dans l'ordre ; `ids` : toutes, une fois chacune | `reserve_aux_admins`, `demande_invalide` |

- **Formules en écriture directe** (admins) : `insert` et `update` du seul `name` (rang en fin), `delete` ; doublon `23505` ; utilisée : `formule_utilisee`. Un éditeur : `insert` refusé (`42501`), `update` et `delete` sans effet.
- **Lecture directe** : `versions`, `access_levels`, `contents.access_chosen`. « Modifié depuis la publication » : `contents.draft_rev` ≠ `draft_rev` de la version en ligne. Historique : `order by number desc` (`number`, `origin`, `published_at`, `published_by_name`, `access_level_name`).
- **État de la programmation** : `scheduled_at` à venir : programmé ; passé : en attente ([D31]) ; vide avec `schedule_error` : échec (`auteur_parti`, `brouillon_en_cours_d_ecriture`, `erreur_inattendue`, ou un code de `publish`), avec `scheduled_by`. Effacé par `unschedule` ou une nouvelle programmation.
- Après `publish` et `unpublish` (si `needs_file_sync`) : `kickFiles()`, puis relire.

**Contrat pour l'app** : § 5.1 (`app_content`, `app_page`, `app_access_levels`).

**Contrat de la base pour l'admin (étape 5, partie n° 2)** (règles : § 3.6)

| RPC | Renvoie | Erreurs |
|---|---|---|
| `trash(content_id)` | `{ needs_file_sync }` (`.single()`) ; toutes sortes ; rejouable ; « Annuler » appelle `restore` | `contenu_introuvable`, `verrou_tenu` (`hint` : nom ou e-mail), `modele_utilise` (`hint` : titres, corbeille comprise) |
| `restore(content_id)` | `{ restored, warnings, title }` ; `warnings` ⊂ `adresse_retiree`, `titre_renomme` (`title` : le nouveau) ; hors corbeille : `restored = 0` | `contenu_introuvable`, `titre_pris`, `adresse_prise` (pris entre-temps, index unique) |
| `empty_trash(items?)`, `media_outdated`, `media_push` | étape 3 | |

- Après `trash` (si `needs_file_sync`) et `empty_trash` : `kickFiles()` ; après `media_push` aussi (sans effet utile).

**Contrat pour l'app (partie n° 2)** : `app_file_locations` et la politique Storage de `files-protected` (§ 4.5, § 5.1).

### Étape 6 : Modèles de blocs

Plan, réalisation et écarts : [journal archivé](archives/journal-construction.md), « Étape 6 ».

**Contrat de la base pour l'admin (étape 6)** (règles : § 2.5, § 3.5)

| RPC | Renvoie | Erreurs |
|---|---|---|
| `content_create(…, from_template_id?, template_for?)` | étape 4 ; `template_for` obligatoire pour un `starter`, interdit sinon | |
| `template_create_from(content_id, block_ids uuid[], name, sort, template_for?)` | la ligne du modèle : blocs de premier niveau du brouillon **enregistré**, dans l'ordre, nouveaux `id`, blocs liés copiés ; aucun verrou, brouillon inchangé | `sorte_invalide`, `demande_invalide` (nom vide ou de plus de 200, aucun bloc, doublon), `titre_pris` (nom d'un autre modèle), `contenu_introuvable`, `dans_la_corbeille`, `bloc_introuvable` (pas au premier niveau), `modele_un_seul_bloc` (`shared` de plusieurs blocs), `modele_indisponible` (bloc lié vers un modèle indisponible) |
| `template_outdated(template_id)` | `{ content_id, kind, title, version_id, version_number, published_at }` ; vide pour un modèle inconnu, autre, vide ou à la corbeille | |
| `template_push(template_id)` | `{ content_id, version_id, version_number }` (`draft_rev` de la version en ligne) ; rejouable ; puis `kickFiles()` | `modele_introuvable` (inconnu ou pas `shared`), et pour tout le geste `image_sans_fichier`, `fichier_indisponible`, `fichier_inadapte`, `forme_invalide`, `brouillon_trop_imbrique` |
| `template_detach_all(template_id)` | `{ content_id, draft_rev }` par brouillon changé (corbeille comprise), révision recopiée dans `edit_locks` ; rejouable | `modele_introuvable`, `verrou_tenu` (`hint` : la personne) |

- Erreurs du brouillon : § 3.2, point 5 (`modele_utilise` : `hint` liste les brouillons).
- **Lecture directe** : `contents.template_for` ; brouillons citant un modèle par `draft_template_ids` (`overlaps` / `cs`), corbeille comprise ; `template_copies`. **Écriture directe** : `template_copies` (doublon ignoré).
- Détacher dans un contenu : côté admin, par `save_draft` (§ 3.5).

### Étape 7 : Sections

Plan, réalisation et écarts (partie 7a : Pages, Blog, Podcasts, Accueil ; partie 7b : les méthodes, retirées le 06/10/2026) : [journal archivé](archives/journal-construction.md), « Étape 7 ».

**Contrat de la base pour l'admin (étape 7, partie 7a, et ajouts suivants)**

| RPC | Renvoie | Erreurs |
|---|---|---|
| `categories_reorder(section, ids uuid[])` | les catégories de la section dans l'ordre (positions 0, 1, 2…) ; `ids` : **toutes**, une fois | `demande_invalide` (section inconnue, liste absente, incomplète, en double ou d'une autre section) |
| `contents_reorder(kind, ids uuid[])` ([D47]) | `{ id, list_position }` des articles ou épisodes hors corbeille ; `ids` : **tous**, une fois | `demande_invalide` (autre sorte, liste incomplète ou en double) |

- Catégories d'un contenu : `category_ids` de `save_draft`, facultatif ([D44]).
- Durée d'un épisode : `media.duration_s` (`numeric`, secondes) du fichier de `draft.audio.mediaId` ; transcription : `media.transcript` (avertissement [D46]).
- **Contrat pour l'app** : `app_feed`, `app_categories` (§ 5.1).

## 7. Limites de l'offre gratuite et risques

> **En bref** : l'offre gratuite suffit pour construire et essayer l'admin, pas pour lancer l'app avec des podcasts : Pro est prévu avant le lancement. Les autres risques ont une parade.

- **500 Mo de base** (300 contenus × 15 versions × 15 Ko ≈ 70 Mo avant compression) : 256 Ko par brouillon, purge des journaux, historique entier **[D23]**. **À faire** : taille de la base dans les Paramètres (alerte à 400 Mo) puis, au besoin, 20 versions par contenu, jamais la version en ligne.
- **1 Go de fichiers, 50 Mo par fichier, 5 Go téléchargés par mois** : assez pour des photos, pas pour des podcasts : Pro, épisodes de test courts, occupation affichée.
- **Cache CDN sans vidage** : 2 minutes au pire (§ 4.6).
- **Pas de sauvegarde** : `sauvegarde.yml` (`supabase/CLAUDE.md`) ; Pro : quotidienne.
- **Pause après une semaine** : `ping()` quotidien (§ 3.9), rattrapage des programmations au redémarrage.
- **Fonctions Edge** (500 000 appels sans dépassement, 256 Mo, 2 s de processeur) : `kick_files` n'appelle que s'il y a du travail, lecture des fichiers protégés sans fonction, SVG et Lottie à 5 Mo et trois essais : quelques milliers d'appels par mois. Appels publics de `files` : seulement `kick`, freiné (§ 3.7), mais comptés (comme pour toute fonction à `verify_jwt = false`).
- **Realtime** (200 connexions, 2 M messages par mois) : sans effet (`edit_locks` seulement, repli par appels).
- **pg_net sans garantie de livraison** : `files` idempotente, relancée chaque minute ; rien ne part d'une transaction annulée.
- **pg_jsonschema 0.3.3** (`oneOf` exponentiel, `format` ignoré, 29 niveaux, environ 10 ms pour 256 Ko) : `if`/`then`/`else`, `pattern`, `brouillon_trop_imbrique`.
- **Schéma qui change** : on n'ajoute que ; un changement cassant passe par une migration et `v: 2`.
- **SVG en liste blanche** : au pire un SVG exotique refusé (export Inkscape brut), accepté une fois nettoyé ; aucun script exécuté (`<img>`, `react-native-svg`).
- **Ajv sous Hermes**, **lottie-react-native** : à vérifier dans l'app (replis : `@cfworker/json-schema`, `npx expo-doctor`).
- **Pas de préproduction** (deux projets gratuits pris) : tout se teste en local et **sur GitHub à chaque demande de fusion** (§ 6.0).
- **pg_cron en GMT** : tout en `timestamptz`, `zoneToInstant` testé aux changements d'heure.
- **Onglet caché**, **reprise de la main** : § 3.3 (au plus 1,5 s de frappe perdue côté serveur, gardée dans le navigateur).
- **Comptes hors équipe** : fiche sur invitation seulement (§ 3.1).
- **Un seul admin** : personne ne réinitialiserait sa double vérification (ADMIN § 2), et les parcours veulent deux comptes : **inviter un second admin** avant l'usage en ligne (`installation/README.md`). En local, les tests créent leurs comptes ; le seed n'a que les réglages de `fichiers`.

---

## 8. Décisions prises en autonomie (à relire par l'utilisateur)

> **En bref** : les choix faits sans demander, pour qu'on puisse les valider ou les changer. Une décision retirée ou remplacée garde son numéro (le code les cite) ; son texte d'origine est dans [le journal archivé](archives/journal-construction.md).

### 8.1 Décisions

| n° | Décision, et pourquoi |
|---|---|
| D1 | Noms en anglais, comme `profiles` (cohérence avec l'étape 2). |
| D2 | Les versions figent la formule, pas son rang : le rang est un réglage. |
| D3 | Une seule table `contents`, modèles compris : un seul éditeur, verrou, corbeille et enregistrement. |
| D4 | **Retirée** (06/10/2026, avec les méthodes). |
| D5 | **Retirée** (28/09/2026, remplacée par [D43], retirée avec les méthodes). |
| D6 | « Utilisé » = cité par un brouillon (corbeille et modèles compris) ou une version en ligne ; l'historique ne protège pas, sinon rien ne se supprimerait. |
| D7 | Schéma des blocs en draft-07 écrit à la main, pas tiré de Zod : maîtrise de ce que lisent Ajv, pg_jsonschema et l'app, aucune dépendance au convertisseur, draft-07 le plus sûr pour pg_jsonschema. |
| D8 | Générateur dans `web/`, source dans `blocks/`, validateurs autonomes (`mobile/` sans `ajv`). |
| D9 | `mediaId` pour tout fichier, `templateId` pour tout modèle : les blocs futurs sont suivis sans rien changer. |
| D10 | Titres 2 et 3 seulement (le titre du contenu est le niveau 1) ; liens `https:` et `mailto:`, sans `target` ni `rel`. |
| D11 | Un bloc partagé = exactement un bloc (« le même bloc », ADMIN § 5). **Validé le 27/09/2026.** |
| D12 | `blocks.tokens.json` partagé par l'aperçu et l'app : un aperçu fidèle. |
| D13 | Verrou en base (20 s, 90 s, relâché après 30 minutes cachées), libéré en vidant `holder_id`, suivi par Realtime sur `edit_locks` avec repli à 30 s, sans Presence. |
| D14 | Publier est refusé si un **autre** membre écrit ; sinon on publie sans prendre le verrou. |
| D15 | Texte alternatif ni exigé ni réclamé (02/10/2026 : avertissements jugés trop présents). |
| D16 | La programmation publie le brouillon enregistré à l'heure dite, pas une copie (voir D31). **Validé le 27/09/2026.** |
| D17 | **Retirée** (06/10/2026, avec les méthodes). |
| D18 | Restaurer ramène en brouillon, sans republier (« Publier reste un geste volontaire », ADMIN § 4). **Validé le 27/09/2026.** |
| D19 | Workflow GitHub quotidien vers `public.ping()` avec la clé publishable, ni tâche Vercel ni `CRON_SECRET` : pg_cron ne compte peut-être pas comme activité. |
| D20 | Buckets créés par migration, pas dans `config.toml` : une seule source. |
| D21 | Cache d'une minute (question 5, réponse B, 27/09/2026) ; un fichier ne se remplace jamais (cache de l'app par `id`). |
| D22 | Liens temporaires de 1 h (images, PDF) et 6 h (audio, pour écouter sans coupure). |
| D23 | Historique entier ; alerte et purge à faire (§ 7). |
| D24 | Tout fichier d'abord protégé ; public si un contenu gratuit en ligne l'utilise ou s'il est une image mise en avant en ligne (question 1, réponse B, 27/09/2026 ; ADMIN § 6). |
| D25 | SVG nettoyés par le navigateur **et** vérifiés par la fonction Edge (refus sans réécriture) ; Lottie de même, « expressions » acceptées. |
| D26 | **Retirée** (06/10/2026, avec les méthodes). |
| D27 | **Remplacée** par [D47] (30/09/2026) : l'ordre suivait la première publication. |
| D47 | Un ordre par section, brouillons compris (`list_position`, neuf en tête, `contents_reorder`), suivi par `app_feed` ; une correction ne déplace rien. **Validé le 30/09/2026.** |
| D48 | Remplacer = un **nouveau** fichier du même type ([D21] tient) : `media_replace` dans les brouillons, `media_replace_live` en ligne sur décision ; rien ne change dans l'app sans geste volontaire. **Validé le 30/09/2026.** |
| D49 | **Titre obligatoire** pour publier ou programmer (`titre_manquant`, avant l'image ; des espaces ne suffisent pas) ; un contenu en ligne sans titre y reste. **Validé le 02/10/2026.** |
| D28 | Supprimer une catégorie est définitif (la corbeille d'ADMIN § 3 ne les liste pas) ; l'app ignore les disparues. |
| D29 | **Retirée** (06/10/2026, avec les méthodes ; reprise pour les méthodes refaites, ADMIN § 1). |
| **D30** | **Textes du fichier figés à la publication** ; **option B retenue le 27/09/2026** : « Mettre à jour ces N contenus dans l'app » (`media_push`, § 2.4). |
| **D31** | **Programmation pendant qu'on écrit** : attente de minute en minute, une heure au plus, puis échec ; bandeau dans l'éditeur (§ 3.8). **Validé le 27/09/2026.** |
| **D32** | **Remplacée** (09/10/2026, `…_formule_supprimable.sql`) : une formule se supprime dès qu'aucun brouillon, contenu en ligne ni lecteur ne s'en sert ; les anciennes versions gardent son nom (§ 1.3). |
| **D33** | Types en liste fermée ; GIF et HEIC convertis, GIF animé averti ; types audio normalisés (`audio/x-m4a` → `audio/mp4`) : aucun format que l'app ne sait pas afficher. |
| **D34** | Légende : texte simple de 300 caractères. **Retirée de l'admin le 02/10/2026** : toujours `null`, non affichée, remise possible sans perte. |
| **D35** | Brouillon limité à 256 Ko, pour les 500 Mo de base. |
| D36 | **Retirée** (06/10/2026, avec les méthodes). |
| **D37** | `reader_access` **provisoire**, à revoir avec le paiement (ADMIN § 10). |
| **D38** | Page Corbeille dès l'étape 3 (fichiers), et non à l'étape 5 (ADMIN § 11). |
| **D39** | SVG et Lottie à 5 Mo ; trois vérifications ratées → refusé. |
| **D40** | Envoi standard par `XMLHttpRequest` ; `<style>` d'un SVG gardé sans adresse extérieure ni échappement ; aperçu Lottie par `lottie-web` « light » à la demande ; PDF en icône et lien (pas de pdf.js) ; deux envois à la fois ; un envoi annulé ou abandonné effacé aussitôt. |
| **D41** | **Pas de niveau d'accès par défaut** (27/09/2026) : `acces_a_choisir` jusqu'au choix par `save_draft` ; rien ne part gratuit par oubli. |
| **D42** | **Remplacée** (08/10/2026) : un point de départ appartient à `article`, `episode` ou `page` (`template_for`, autrefois aussi `chapter`, `lesson`, `exercise`), fixe ; `content_create(from_template_id)` refuse une autre sorte (`modele_indisponible`). |
| D43 | **Retirée** (06/10/2026, avec les méthodes ; gardée pour les méthodes refaites, ADMIN § 1). |
| **D44** | Catégories **facultatives** (28/09/2026). |
| **D45** | **Image mise en avant obligatoire** pour un article ou un épisode, pas une page (28/09/2026) : la vignette publique des listes doit exister. |
| **D46** | **Transcription conseillée** pour un épisode (28/09/2026) : l'éditeur avertit ; `media_push` la propage. |

### 8.2 Questions pour toi

Les cinq questions du 27/09/2026 et leurs réponses sont dans [le journal archivé](archives/journal-construction.md). **Une seule reste ouverte** : les comptes des lecteurs de l'app, dans le même projet Supabase (inscriptions à ouvrir, sécurité de l'admin tenue par la fiche d'équipe sur invitation, § 3.1) ou ailleurs, à décider avec le paiement (§ 5.4).

### 8.3 Ce qui a été corrigé par rapport aux propositions

Dans [le journal archivé](archives/journal-construction.md).
