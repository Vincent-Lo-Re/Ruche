# Contenus : architecture (étapes 3 à 7)

> La référence de la base et du code des contenus, **tenue à jour** (revue contre la base et le code le 10/10/2026). Références : `docs/ADMINISTRATION.md` (cité **« ADMIN § n »**) et `CLAUDE.md`. Un renvoi « § n » ou « § n.m » sans autre mention désigne une partie de **ce** document.
> L'histoire de la construction (plan de chaque étape, ce qui a été fait, écarts, méthodes construites puis retirées, ménages de la base) est dans [docs/archives/journal-construction.md](archives/journal-construction.md) : c'est un historique, pas une référence.
> Cadre : l'offre **gratuite** de Supabase (500 Mo de base, 1 Go de fichiers, 50 Mo par fichier, pas de transformation d'images, pas de vidage du cache CDN) et Vercel Hobby. L'offre Pro reste prévue avant le lancement de l'app (ADMIN § 8), mais rien ici n'en dépend.
> **Sortes de contenus** : `article`, `episode`, `page` et `template` (modèle de bloc). L'ancien système des méthodes est retiré de l'admin et de la base depuis le 06/10/2026 (`…_methodes_retirees.sql`), ses derniers restes le 08/10/2026 (`…_menage_de_la_base.sql`). Les méthodes refaites en écrans sont un plan (ADMIN § 1), pas encore construit (§ 1.8).
> Chaque partie commence par un **En bref** pour une lecture sans connaissances techniques. Le détail qui suit s'adresse au développeur. Les choix faits en autonomie sont notés **[Dn]** et regroupés au § 8.1.

## En bref

1. Tout ce qui s'écrit (article, épisode, page, modèle) est rangé dans **une seule table**. On écrit donc une seule fois l'éditeur, l'enregistrement automatique, le verrou « un seul à la fois » et la corbeille.
2. Chaque contenu a **un brouillon**. « Publier » en fait une **copie figée**, que l'app lit. Les copies successives forment l'historique.
3. Les méthodes ne sont pas dans la base : l'ancien système est retiré depuis le 06/10/2026, la nouvelle structure viendra avec sa migration (ADMIN § 1, « Méthodes, refaites en écrans »).
4. La forme des blocs est décrite **une seule fois**. L'admin et la base vérifient chacune ce même fichier ; l'app le fera aussi.
5. Tout fichier arrive **protégé**. Il ne devient public que quand un contenu gratuit publié l'utilise, ou quand il est l'image mise en avant d'un contenu publié, même réservé. Il redevient protégé sinon. Sans l'offre Pro, son ancienne adresse publique peut encore marcher deux minutes au plus.
6. Les publications programmées, la vidange de la corbeille et le rangement des fichiers se font **dans Supabase**, par des tâches planifiées et une seule fonction serveur.
7. L'app ne lit jamais les tables : elle appelle quelques **fonctions de lecture** qui ne renvoient que ce qui est publié, et seulement ce que le lecteur a le droit de voir.
8. Deux titres pareils ne cohabitent pas dans une même section (deux articles, deux épisodes, deux pages ou deux modèles), majuscules et espaces ignorés.
9. La construction s'est faite en 5 étapes (3 à 7). Le § 6 garde le **contrat de la base** de chaque étape ; le récit est archivé. Une seule question reste ouverte : les comptes des lecteurs, à décider avec le paiement (§ 8.2).

---

## 1. Modèle de données

> **En bref** : huit tables pour les contenus et les fichiers, plus deux petites tables techniques (verrou d'édition et contrôle des fichiers). Un contenu est une ligne avec son brouillon ; chaque publication est une ligne à part, qu'on ne modifie pas.

### 1.1 Conventions

- **Noms en anglais**, comme `profiles` **[D1]**. Les textes de l'interface sont dans `web/src/texts/en.ts` (la langue de référence) et `web/src/texts/fr.ts` (tirés de l'anglais), lus par `web/src/texts.ts`.
- **Schéma `public`** : les tables (RLS active partout) et les fonctions appelables (RPC). **Schéma `private`**, non exposé par l'API (`config.toml` n'expose que `public` et `graphql_public`) : les fonctions internes, la vue `private.live`, la table `private.settings` et le schéma des blocs. Toute fonction `security definer` a `set search_path = ''` et des noms qualifiés (`public.contents`…).
- **Droits de départ**, comme pour `profiles` : `revoke all … from anon, authenticated`, puis on ne rend que ce qui est listé au § 3.1. Dans `private`, l'`EXECUTE` que Postgres donne par défaut à `PUBLIC` sur toute nouvelle fonction est retiré (§ 4.5).
- **Les politiques écrivent `(select public.is_staff())`** et sont déclarées `to authenticated`. `anon` n'a pas le droit d'exécuter `is_staff()` : une politique qui l'appellerait pour `anon` lèverait une erreur de droits.
- **Chaque RPC de l'admin** est `security definer`, son `EXECUTE` est retiré à `public` et `anon`, et elle commence par `private.require_staff()` (ou `private.require_admin()`). Ce garde n'est **que** dans la RPC publique : le travail lui-même est dans une fonction interne sans garde, comme `private.do_publish(content_id, author_id, origin, expected_rev)`, que `publish` appelle avec `auth.uid()` et que la tâche `publications` appelle avec l'auteur de la programmation. Sous pg_cron, `auth.uid()` et `auth.jwt()` sont nuls et `is_staff()` vaut faux (§ 3.8).
- **Les erreurs** : le code `P0001` et un `message` court et stable (`verrou_perdu`, `conflit_revision`, `fichier_utilise`, `adresse_prise`, `titre_pris`…) que l'admin traduit (`texts.editor.errors`…). Le `detail`, en français, reste pour les journaux : l'admin ne l'affiche jamais. Les faits utiles (un nom, ou une liste en JSON) sont dans `hint`, que l'admin met en phrase (`describeFacts` de `web/src/lib/error-facts.ts`).
- **Fonctions réservées à la fonction Edge** : comme `team_members()`, ce sont des fonctions `public.files_*` en `security definer`, dont l'`EXECUTE` est retiré à `public`, `anon` et `authenticated` et accordé à `service_role` seulement (§ 3.7). La fonction Edge ne peut pas appeler une fonction de `private` par l'API, même avec la clé secrète.
- **Dates** en `timestamptz`. L'affichage passe par `formatDateTime` (`web/src/lib/dates.ts`), au fuseau de l'admin (`admin_identity.time_zone`, Paris au départ, `web/src/lib/time-zone.ts`) et dans le format régional (`web/src/lib/regional-format.ts`).
- **Auteurs** :
  - dans `contents` et `media`, `created_by`, `draft_saved_by`, `deleted_by`, `scheduled_by` référencent `public.profiles(id)` `on delete set null`. Le garde de corbeille de `contents` laisse passer ces mises à `null` (§ 3.2) ;
  - dans `versions`, `published_by` est un simple `uuid` **sans clé étrangère**, et le nom est recopié dans `published_by_name`. Une version ne change pas : une clé `on delete set null` serait une modification, et bloquerait le retrait d'un membre qui a déjà publié ;
  - dans `edit_locks`, `holder_id` → `profiles` `on delete set null` : retirer un membre libère ses verrous.

### 1.2 Vue d'ensemble

| Table | Rôle | Créée à l'étape |
|---|---|---|
| `media` | La médiathèque. | 3 |
| `media_audit` | Le résultat du contrôle hebdomadaire des fichiers orphelins. | 3 |
| `contents` | Tout ce qui s'écrit, avec son brouillon unique et son état (en ligne, programmé, corbeille). | 4 |
| `edit_locks` | Qui écrit quel brouillon en ce moment (verrou « un seul à la fois »). | 4 |
| `categories`, `content_categories` | Les catégories du Blog et des Podcasts, et leur lien avec les brouillons. | 4 |
| `versions` | Les copies figées : ce que lit l'app, et l'historique. | 5 |
| `access_levels` | Les formules d'abonnement, rangées de la moins complète à la plus complète. « Gratuit » n'est pas une ligne. | 5 |
| `reader_access` | **Provisoire** : la formule de chaque lecteur, pour écrire et tester les règles des contenus réservés. Vide jusqu'au choix du paiement. | 5 |
| `template_copies` | Où une mise en forme ou un point de départ a été copié (§ 1.12). | 08/10/2026 |

Hors de ce document : `profiles` (l'équipe), `admin_identity` et `admin_brand_variants` (l'identité de l'admin, CLAUDE.md), et `private.settings` (§ 3.8).

### 1.3 `access_levels` (formules)

- `id uuid`, `name text` (1 à 100 caractères, unique à la casse près), `rank int` avec `unique (rank) deferrable initially deferred`, pour réordonner en une transaction.
- Écriture : `is_admin()` seulement (insertion, renommage, suppression). Le rangement passe par `access_levels_reorder(ids uuid[])`, qui réécrit tous les rangs d'un coup.
- **Suppression** **[D32]** : refusée (`formule_utilisee`) tant qu'un brouillon (`contents.access_level_id`), un contenu en ligne (`private.live`) ou un lecteur (`reader_access`, `on delete restrict`) s'en sert. Une formule qui ne sert plus qu'à d'anciennes versions se supprime (09/10/2026, `…_formule_supprimable.sql`) : chaque version garde le nom de sa formule en texte (`versions.access_level_name`, figé à la publication), et sa clé `access_level_id` passe à `null` (`on delete set null`, § 1.7).
- Les versions figent l'**identifiant** de la formule, pas son rang : réordonner les formules change tout de suite ce que chaque abonné peut ouvrir **[D2]**. C'est un réglage de l'admin, pas une modification de contenu.

### 1.4 `reader_access` (lecteurs), provisoire

ADMIN § 10 remet à plus tard les formules et le service de paiement. Cette table n'est **qu'un support provisoire** pour écrire et tester les règles des contenus réservés (qui lit quoi) **[D37]**. Sa forme (liens vers `auth.users`, date de fin, origine) et la façon dont elle sera remplie seront revues quand le paiement sera choisi ; les règles de lecture, elles, ne dépendent que de `private.reader_rank()`.

- `user_id` (clé primaire, → `auth.users` `on delete cascade`), `access_level_id` (→ `access_levels` `restrict`), `valid_until timestamptz null`, `source text`, `created_at`.
- Écrite **uniquement avec la clé secrète**. Un lecteur lit sa propre ligne ; `authenticated` n'a aucun droit d'écriture.
- `private.reader_rank()` (`security definer`, `stable`) renvoie le rang de la formule en cours de validité de `auth.uid()`, ou `null` (anonyme, ou sans abonnement). Elle n'est exécutable ni par `anon` ni par `authenticated` : seules les fonctions `security definer` l'appellent.
- Les lecteurs de l'app auront un compte : dans le même projet Supabase ou non, c'est la question encore ouverte (§ 8.2).

### 1.5 `categories` et `content_categories`

- `categories` : `id`, `section text check (section in ('blog','podcasts'))`, `name` (1 à 100 caractères), `position int`, `created_at`, `unique (section, lower(name))`. Le nom est nettoyé (espaces, NFC) et la position manquante mise en fin de section par un déclencheur ; la section ne change pas (`categorie_invalide`). Le rangement d'une section passe par `categories_reorder(section, ids)`.
- `content_categories (content_id, category_id)` en clé primaire, `on delete cascade` des deux côtés. Un déclencheur vérifie que la section correspond à la sorte : Blog pour un article, Podcasts pour un épisode. Les pages et les modèles n'ont pas de catégorie.
- Ce sont les catégories **du brouillon**, écrites par le réglage `category_ids` de `save_draft`. À la publication, leurs identifiants sont recopiés dans `versions.category_ids` : l'app filtre sur ce qui est publié. Elles sont facultatives **[D44]**.
- Supprimer une catégorie est une vraie suppression : la corbeille d'ADMIN § 3 ne liste pas les catégories **[D28]**. Elle quitte les brouillons par cascade ; dans l'app, les fonctions de lecture ignorent les identifiants qui n'existent plus. L'historique affiche « catégorie supprimée ».

### 1.6 `contents` (la table commune)

| Colonne | Détail |
|---|---|
| `id uuid` | |
| `kind text` | `article`, `episode`, `page`, `template`. Ne change jamais (déclencheur `contents_10_kind`, `sorte_immuable`). |
| `draft jsonb` | **le brouillon unique** (forme au § 2.2) |
| `title text` | colonne générée : `draft->>'title'` (listes, recherche, titre unique) |
| `draft_rev int` | augmente à chaque changement du brouillon (contrôle de conflit) |
| `draft_saved_at`, `draft_saved_by` | dernier enregistrement |
| `access_level_id uuid null` → `access_levels` `restrict` | `article`, `episode`, `page` seulement (`null` = gratuit) |
| `access_chosen bool not null default false` | `article`, `episode`, `page` : vrai dès que l'équipe a choisi « Gratuit » ou une formule (réglage `access_level_id` de `save_draft`, `null` compris). Tant qu'il est faux, `publish` et `schedule` refusent (`acces_a_choisir`) **[D41]** |
| `slug text` | `page` seulement : l'adresse que l'app demande (`mentions-legales`…), **dans le brouillon** (`^[a-z0-9]+(-[a-z0-9]+)*$`, 100 caractères au plus). L'adresse en ligne est celle de la version publiée (`versions.slug`, § 1.7). `unique (slug) where kind = 'page' and deleted_at is null` |
| `template_sort text` | `template` seulement, obligatoire : `style` (mise en forme), `shared` (bloc partagé) ou `starter` (point de départ). Ne change jamais. |
| `template_for text` | `starter` seulement, obligatoire : la sorte de contenu que le point de départ sert à créer (`article`, `episode` ou `page`) **[D42]**. Choisie à la création, ne change jamais. |
| `live_version_id uuid null` | la version que lit l'app (`null` = pas dans l'app). `article`, `episode`, `page` seulement. |
| `first_published_at timestamptz` | date de la première publication (gardée ; l'ordre des listes suit `list_position`, **[D47]**) |
| `list_position integer` | article ou épisode seulement (toujours rempli pour eux, toujours `null` pour les autres) : sa place dans la liste de sa section, la plus petite en tête ; un contenu neuf arrive en tête (déclencheur `contents_05_list_position`) ; rangée par `contents_reorder` ; l'admin et l'app suivent cet ordre, brouillons compris **[D47]** |
| `scheduled_at`, `scheduled_by`, `scheduled_rev int`, `schedule_error text` | publication programmée (`article`, `episode`, `page`) : l'heure, qui l'a programmée, la révision du brouillon à ce moment (§ 3.8, [D31]), et l'éventuel échec |
| `deleted_at`, `deleted_by` | corbeille ; chaque contenu part et revient seul |
| `draft_media_ids uuid[]`, `draft_template_ids uuid[]` | tenus par le déclencheur du brouillon à partir de `draft` |
| `created_at`, `created_by` | |

**Contraintes**
- `check` par sorte : `slug` (page), `template_sort` (modèle, obligatoire), `template_for` (point de départ, obligatoire), `access_level_id`, `access_chosen`, `live_version_id`, `scheduled_*` (article, épisode, page), `list_position` (article, épisode). `deleted_by` seulement dans la corbeille ; `scheduled_rev` dès que `scheduled_at` est rempli.
- **Clé étrangère composite** `(live_version_id, id) → versions (id, content_id)`, `on delete set null (live_version_id)` (Postgres 15+) : un contenu ne peut pas pointer vers la version d'un autre.
- `check (octet_length(draft::text) <= 262144)` : 256 Ko par brouillon, pour ménager les 500 Mo de base **[D35]**. Un long article fait quelques dizaines de Ko ; les images ne sont que des références.
- **Un titre par section** (09/10/2026, ADMIN § 4) : index unique `contents_title_key` sur `(kind, private.title_key(title))`, hors corbeille et hors titre vide. `private.title_key` met le titre en NFC, retire les espaces du bord, réduit ceux du milieu et passe en minuscules (les accents comptent). Deux articles, deux épisodes, deux pages ou deux modèles (toutes sortes de modèles confondues) ne portent pas le même titre ; un article et un épisode le peuvent. `content_create`, `save_draft` et `template_create_from` refusent un titre pris (`titre_pris`) ; `restore` et `revert_to_version` renomment (« Mon article (2) », `private.free_title`) et le disent (`titre_renomme`). `content_title_taken(kind, title, except_id)` dit à l'admin, pendant qu'on tape, quel contenu porte déjà ce titre.

**Index** : `(kind, deleted_at, draft_saved_at desc)` pour les listes ; `(scheduled_at) where scheduled_at is not null` ; GIN sur `draft_media_ids` et `draft_template_ids` ; `contents_feed_idx` `(kind, list_position, id)` des contenus en ligne hors corbeille, pour `app_feed` ; le titre unique ; un index par colonne d'auteur, sur `access_level_id`, `template_for` et la clé composite.

Pourquoi une seule table, modèles compris ? Toutes ces sortes ont besoin des mêmes choses : un brouillon en blocs, l'enregistrement automatique, le verrou, la corbeille et le « où est-il utilisé ». Le prix est une série de `check` par sorte, écrits une fois et testés par pgTAP **[D3]**.

### 1.7 `versions` (copies figées et historique)

| Colonne | Détail |
|---|---|
| `id`, `content_id` → `contents` `on delete cascade` | `unique (id, content_id)` pour la clé composite ci-dessus |
| `number int` | 1, 2, 3… par contenu, `unique (content_id, number)` |
| `origin text` | `manual`, `scheduled`, `template` (mise à jour d'un bloc partagé), `files` (mise à jour des textes de la médiathèque ou remplacement d'un fichier, [D30] option B, [D48]) |
| `body jsonb` | copie figée du brouillon : blocs partagés **résolus**, textes alternatifs **résolus** (§ 2.4), vérifiée par le schéma `published` |
| `files jsonb` | pour chaque fichier cité : `kind`, `mime`, `alt`, `transcript`, `width`, `height`, `duration_s`, **figés** au moment de la publication ([D30]) |
| `access_level_id` → `access_levels` `on delete set null` | accès figé ; `null` = gratuit, ou formule supprimée depuis (alors `access_level_name` est rempli, § 1.3) |
| `access_level_name text` | le nom de la formule, figé à la publication (lisible dans l'historique même après sa suppression) |
| `slug text` | pages seulement : l'adresse figée, celle que cherche `app_page` |
| `category_ids uuid[]` | catégories figées (GIN) |
| `media_ids uuid[]` | tous les fichiers cités, couverture et audio compris (GIN) |
| `cover_media_id uuid` | l'image mise en avant (`cover.mediaId` du corps), recopiée pour la règle « public ou protégé » : elle est publique tant que la version est en ligne, quel que soit le niveau (§ 4.4) ; `check` : elle est dans `media_ids` |
| `template_ids uuid[]` | blocs partagés recopiés dans la version (GIN) |
| `block_types text[]` | sortes de blocs utilisées, pour prévenir quand une ancienne app ne sait pas les afficher |
| `draft_rev int` | révision du brouillon d'origine (affichage « modifié depuis la publication ») |
| `published_at`, `published_by` (uuid, sans clé étrangère, § 1.1), `published_by_name` | auteur et date ; le nom est recopié |

- **Une version ne change pas** : aucun droit `update`/`delete` pour personne, et le déclencheur `versions_immutable` (`before update or delete`, et `before truncate`) refuse (`version_immuable`). Deux seules exceptions : la suppression en cascade, quand son contenu est effacé définitivement ; et la mise à `null` de `access_level_id` quand sa formule est supprimée, toutes les autres colonnes restant identiques.
- Les modèles n'ont jamais de version (§ 2.5).

### 1.8 Les méthodes, en écrans (plan du 06/10/2026, ses points ouverts tranchés par QCM ; à construire)

**Pas construit.** Le plan (Entrée, chapitres, Sortie ; parties simples ou à écrans ; un seul verrou et une seule publication pour toute la méthode) est dans ADMIN § 1, « Méthodes, refaites en écrans ». Il sera décrit ici avec sa migration. Le plan de la base écrit le 06/10/2026 et l'ancien système (retiré le 06/10/2026) sont dans [le journal archivé](archives/journal-construction.md).

### 1.9 `media` (médiathèque)

| Colonne | Détail |
|---|---|
| `id uuid` | |
| `kind text` | `image`, `svg`, `lottie`, `audio`, `pdf` (pas de vidéo) |
| `name text` | nom d'origine, mis en Unicode composé (NFC) par l'admin, par `media_create` et par le trigger (renommage compris) : macOS et Safari donnent souvent des noms en NFD (« e » + accent séparé), que la recherche `ilike` ne trouverait pas et dont le chemin serait abîmé (recherche par `ilike`, suffisante à cette échelle) |
| `path text` | `<id>/<nom-nettoyé>.<ext>`, le même dans les deux buckets |
| `mime`, `size_bytes`, `width`, `height`, `duration_s` | lus dans le navigateur ; l'app s'en sert pour réserver la place sans saut d'affichage |
| `alt text` | images et SVG seulement (`check`) |
| `transcript text` | audios seulement (`check`) |
| `status text` | `pending` (envoi en cours), `checking` (SVG ou Lottie en vérification), `ready`, `rejected` |
| `reject_reason text`, `check_attempts int default 0` | pourquoi un fichier a été refusé ; nombre de vérifications ratées (§ 4.3) |
| `is_public bool default false` | dans quel bucket le fichier se trouve **réellement** |
| `created_at/by`, `deleted_at/by`, `purge_requested_at`, `purge_error text` | corbeille, effacement demandé, et raison d'un effacement refusé (§ 3.7) |
| `status_changed_at` | date du dernier changement d'état (nettoyage des envois abandonnés et des fichiers refusés au bout de 24 h) |
| `sync_error text`, `sync_failed_at` | dernier échec de la fonction `files` sur ce fichier : elle attend 10 minutes avant de réessayer (étape 3) |

- `check` entre `kind` et `mime` : `image` → `image/jpeg`, `image/png`, `image/webp` ; `svg` → `image/svg+xml` ; `lottie` → `application/json` ; `audio` → `audio/mpeg`, `audio/mp4` ; `pdf` → `application/pdf`. Le navigateur annonce parfois d'autres noms pour les mêmes formats (`audio/x-m4a` ou `audio/m4a` pour un `.m4a` depuis Safari ou macOS, `audio/mp3` pour un `.mp3`) : l'admin **normalise le type** d'après l'extension et les premiers octets avant l'envoi, et c'est ce type normalisé qui est déclaré à Storage et à la base **[D33]**.
- `check (size_bytes <= 52428800)`, et `check (kind not in ('svg', 'lottie') or size_bytes <= 5242880)` : 5 Mo au plus pour un SVG ou un Lottie, pour que la fonction Edge puisse le vérifier (§ 4.3) **[D39]**.
- Index : `(kind, deleted_at, created_at desc)`.
- **Un fichier ne se remplace jamais** : une nouvelle version d'une image est un nouveau fichier, avec un nouvel `id` et une nouvelle adresse. Cela évite les problèmes de cache et permet à l'app de garder ses images en cache par `id`.
- **« Où il est utilisé »** : `private.media_uses(id)` renvoie les lignes de `contents` dont `draft_media_ids` contient l'id (brouillons, modèles et contenus en corbeille compris), plus les versions **en ligne** (d'après `private.live`) dont `media_ids` le contient. Les anciennes versions de l'historique ne comptent pas **[D6]**.
- **« Non utilisés »** (ajouté le 29/09/2026) : la colonne calculée `public.media_in_use(media)` (`security definer`, `stable`, `search_path` vide ; null hors de l'équipe en aal2, refusée à `anon`) répond `exists (select 1 from private.media_uses(id))`. La liste de l'admin la lit (`select=*,media_in_use`) pour le badge « Non utilisé » et la filtre dans la base (`media_in_use=eq.false`), avant la limite de la liste. Même règle que `media_trash` : un fichier non utilisé peut toujours partir à la corbeille. Tests : `supabase/tests/48_mediatheque_non_utilises.test.sql`.
- **« Remplacer… »** **[D48]** ne contredit pas la règle précédente : le nouveau fichier est un nouveau fichier, du même type et prêt (`private.replacement_pair` : `type_different`, `fichier_pas_pret`). `media_replace(old_id, new_id)` le met à la place de l'ancien dans les brouillons, corbeille comprise, sauf ceux qu'un autre écrit en ce moment (rendus dans la réponse), et lui passe le texte alternatif et la transcription de l'ancien s'il n'en a pas ; `media_replace_live(old_id, new_id)`, sur décision de l'équipe, écrit une nouvelle version (`origin = 'files'`) de chaque contenu en ligne qui le cite.

### 1.10 `edit_locks` (verrou « un seul à la fois »)

- `content_id` (clé primaire, → `contents` `on delete cascade`), `holder_id` (→ `profiles` `on delete set null`, `null` = libre), `holder_session` (l'ouverture de l'éditeur qui tient le verrou, `null` après `content_create` ; ajouté à l'étape 4), `taken_at`, `heartbeat_at`, `draft_rev int`.
- Le verrou est **libre** si `holder_id` est `null`, et **périmé** si `heartbeat_at < now() - interval '90 seconds'`. Relâcher un verrou **ne supprime pas la ligne** : `holder_id` passe à `null` (un `UPDATE`, que Realtime peut filtrer par contenu et soumettre à la RLS). La tâche `menage` efface les lignes sans signe de vie depuis plus d'un jour.
- `draft_rev` est recopié à chaque enregistrement : c'est la seule chose qu'écoutent ceux qui regardent en lecture seule, ce qui garde les messages Realtime minuscules (on n'envoie jamais le brouillon lui-même).
- Comme les modèles sont des lignes de `contents`, ils ont le même verrou.

### 1.11 `media_audit`

`checked_at`, `orphan_paths text[]` (chemins « `<bucket>/<chemin>` ») : les objets Storage sans ligne `media` (restes d'un envoi interrompu), trouvés par le contrôle hebdomadaire (§ 3.7). Le contrôle se fait en SQL (`private.audit_files()`) : Storage liste ses objets à partir de cette même table `storage.objects`, passer par l'API n'apporterait rien. Lecture par l'équipe, affichage dans la Médiathèque **pour toute l'équipe**, avec « Nettoyer » : ADMIN § 2 confie la médiathèque à l'éditeur comme à l'admin.

### 1.12 `template_copies` (copies des modèles)

Une mise en forme ou un point de départ est **copié** dans un contenu, sans lien (§ 2.5). Pour savoir où un modèle a servi (colonne « État » et onglet « Non utilisés » des Modèles de bloc), l'admin note chaque copie depuis le 08/10/2026 (`…_copies_des_modeles.sql`, `recordTemplateCopy` de `web/src/lib/contents/template-copies.ts`).

- `template_id`, `content_id` (clé primaire des deux, chacun → `contents` `on delete cascade`, et `template_id <> content_id`), `copied_at`. Une ligne par modèle et par contenu : la première copie compte, les suivantes sont ignorées.
- L'équipe la lit et y insère (`template_id` et `content_id` seulement), pour une mise en forme ou un point de départ (`template_sort` `style` ou `starter`) et un contenu qui existe ; personne ne la modifie. Un bloc partagé n'y est pas : il reste lié (`draft_template_ids`).

---

## 2. Format des blocs

> **En bref** : un contenu est une liste de blocs (Texte, Image, Encadré). Leur forme est décrite dans un seul fichier, d'où l'on tire automatiquement les vérifications de l'admin, de l'app et de la base. Ajouter un bloc (SVG, animation, PDF) revient à compléter ce fichier et à écrire son affichage.

### 2.1 Une seule description, vérifiée à trois endroits

- **Source** : `blocks/blocks.schema.json` à la racine du dépôt, écrit à la main en **JSON Schema draft-07** **[D7]**. Zod 4 est déjà une dépendance de `web/` (avec React Hook Form, ADMIN § 9) et `z.toJSONSchema()` sait produire du draft-07 (`target: "draft-7"`). J'écris pourtant le schéma à la main, pour deux raisons :
  - la **maîtrise exacte** du résultat : la récursion des listes, `additionalProperties: false` partout, les trois variantes qui partagent les mêmes `definitions`. Le schéma est lu par trois outils différents (Ajv, pg_jsonschema, l'app) ; on relit ce qu'ils reçoivent, pas ce qu'un convertisseur en tire ;
  - **aucune dépendance au convertisseur** : une nouvelle version de Zod ne peut pas changer en silence ce que vérifie la base.
  Le draft-07 reste la version la plus sûre pour la crate de pg_jsonschema 0.3.3. Zod reste l'outil des formulaires.
- **Trois variantes**, qui partagent les mêmes `definitions` :
  - `draft` : brouillon d'un contenu (image sans fichier acceptée, bloc `linked` accepté au premier niveau) ;
  - `template` : brouillon d'un modèle (pas de bloc `linked`, pour éviter les chaînes et les boucles) ;
  - `published` : copie figée (fichier obligatoire, `alt` résolu, marqueur `altFromLibrary` accepté, pas de `linked`).
- **Génération** : `cd web && npm run blocks:generate` (script `web/scripts/blocks-generate.mjs`, avec `ajv`, `json-schema-to-typescript` et `esbuild` en dépendances de développement de `web/`) **[D8]** produit :
  1. `blocks/generated/<variante>.schema.json` et `blocks/generated/schema.sha256` ;
  2. dans `web/src/blocks/generated/` : les types TypeScript (`blocks.ts`), les variables CSS de l'aperçu (`tokens.css`) et des **validateurs Ajv « standalone »** (`validators.js` et `.d.ts` : `validateDraft`, `validateTemplate`, `validateBlock`, `validatePublished`, `validatePublishedBlock`). C'est du JavaScript déjà compilé, sans `new Function` ni `eval` à l'exécution, donc compatible avec Hermes : le script le vérifie. Le code standalone importe encore quelques aides d'Ajv (`ajv/dist/runtime/ucs2length` dès qu'il y a un `maxLength`, `equal`…), et `mobile/` a son propre `node_modules` : le script produit donc un fichier **autonome**, en ESM (`code: { esm: true }`), dans lequel esbuild inclut ces aides ;
  3. `supabase/tests/aides/blocs-cas.inc` : les cas partagés de `blocks/cases/` pour pgTAP (le script vérifie aussi chaque cas avec les validateurs produits) ;
  4. quand le schéma a changé, une **nouvelle migration** `…_schema_blocs.sql` (repérée par la ligne `-- blocks-schema-sha256:`) qui recrée `private.blocks_schema(variant text)` et `private.blocks_schema_hash()` (fonctions `immutable` qui renvoient le JSON et son empreinte SHA-256).
  **À faire avec l'app mobile** : les types et les validateurs pour `mobile/src/blocks/generated/` (l'app n'aura pas besoin d'`ajv` ; à défaut, `npx expo install ajv`), et la vérification de leur chargement sous Hermes.
- **Base** : le trigger du brouillon et la fonction de publication appellent `jsonschema_validation_errors(private.blocks_schema(…), …)` (pg_jsonschema 0.3.3) et renvoient une erreur lisible. Les variantes « compilées » n'existent pas en 0.3.3 : on ne s'en sert pas.
- **Admin** : le validateur généré tourne avant chaque enregistrement ; les types viennent des fichiers générés.
- **App** (à construire) : elle validera **chaque bloc reçu** avec le validateur généré. Un bloc invalide ou inconnu est remplacé par l'encart « Mets à jour l'app pour voir ce passage ».
- **Garde-fous** (sans lire les migrations, donc robuste quand plusieurs migrations touchent le schéma) :
  - job « Administration » : relance `blocks:generate`, puis `git diff --exit-code` ;
  - job « Base de données » : après le démarrage de la base, compare `select private.blocks_schema_hash()` au contenu de `blocks/generated/schema.sha256`.
- **Premier test de l'étape 4** : un test pgTAP qui prouve que pg_jsonschema 0.3.3 applique bien les `$ref` récursifs du draft-07 (listes imbriquées). S'il échoue, on déplie la récursion sur trois niveaux de listes, ce qui suffit pour l'app.
  **Fait (étape 4)** : la récursion marche (`supabase/tests/30_blocs_schema.test.sql` : 6 et 25 niveaux acceptés, lien `javascript:` et propriété en trop trouvés au 6e niveau) ; aucun repli n'est nécessaire. Deux limites mesurées : un `oneOf` (ou `anyOf`, `allOf`) rend la validation exponentielle (le temps double à chaque niveau de liste, 1 s à 12 niveaux, et `statement_timeout` n'interrompt pas le calcul) : le schéma n'utilise donc que `if`/`then`/`else` sur `type` ; au-delà d'environ 29 niveaux de listes, pg_jsonschema ne relit plus le document (`brouillon_trop_imbrique`).

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

- **`id`** : un UUID créé par l'admin (`crypto.randomUUID()`). Il ne change jamais, même quand on déplace le bloc ; il sert au glisser-déposer, au plan, au bloc sélectionné et aux modèles. Un trigger vérifie qu'aucun `id` n'apparaît deux fois dans le document (encadrés compris) : JSON Schema ne sait pas le faire.
- **Convention `mediaId` / `templateId`** : toute référence à un fichier est une clé `mediaId`, y compris l'image mise en avant (`cover`) et le son d'un épisode (`audio`) ; toute référence à un modèle est une clé `templateId`. La requête `jsonb_path_query(draft, 'strict $.**.mediaId')` retrouve donc tous les fichiers, y compris ceux des blocs à venir, sans rien changer **[D9]**.
- **`v`** n'augmente que pour un changement qui casse l'existant, avec une migration SQL qui transforme brouillons et versions. Ajouter un bloc ne change pas `v`.

### 2.3 Les trois blocs de départ

- **Texte** (`text`) : `doc` est un JSON ProseMirror (format Tiptap) **restreint** :
  - nœuds : `doc`, `paragraph`, `heading` (`level` 2 ou 3 : le titre du contenu fait office de niveau 1), `bulletList`, `orderedList` (`start` seulement), `listItem` (premier enfant : un `paragraph`), `hardBreak`, `text` ;
  - marques : `bold`, `italic`, `link` avec seulement `href`, qui doit commencer par `https://` ou `mailto:` **[D10]** ;
  - `additionalProperties: false` partout.
  - Côté admin (`web/src/blocks/text/extensions.ts`) : `StarterKit` sans `blockquote`, `code`, `codeBlock`, `horizontalRule`, `strike`, `underline`, `trailingNode` (sinon un paragraphe vide est ajouté à la fin), `link`, `orderedList` ni `listItem`, avec `heading: { levels: [2, 3] }` ; puis `Link.extend` qui ne garde que `href` (`https://` et `mailto:` seulement, `isAllowedUri`), `OrderedList.extend` qui ne garde que `start`, et `ListItem.extend` avec `content: "paragraph (paragraph | bulletList | orderedList)*"`. Le JSON produit a déjà la forme du schéma ; `cleanTextDoc()` reste un filet avant l'enregistrement (titres ramenés à 2 ou 3 et sortis des listes, `start` ramené entre 1 et 99 999, marques, attributs et nœuds inconnus retirés, texte vide retiré, au moins un paragraphe).
- **Image** (`image`) : `mediaId` (peut être `null` dans un brouillon), `caption` (texte simple, sans mise en forme, 300 caractères au plus, ou `null`) **[D34]** (l'admin ne l'écrit plus depuis le 02/10/2026 : toujours `null`, gardé dans la forme des blocs, qui ne fait qu'ajouter ; l'app ne l'affiche pas), `alt` (`null` = reprendre le texte alternatif de la médiathèque, sinon un texte propre à ce contenu). **Affichage** (03/10/2026) : une photo prend toute la largeur ; un SVG garde sa taille réelle (`media.width`), sans dépasser la largeur, centré, sans coins arrondis (un logo n'est pas agrandi). L'app suivra la même règle.
- **Encadré** (`box`) : `look` vaut `fill` (fond) ou `border` (bordure) ; `blocks` n'accepte **que** `text` et `image`. Le schéma rend donc impossible un encadré dans un encadré, et un bloc lié dans un encadré. **Un encadré vide ne s'affiche pas** (03/10/2026) : ni en Lecture ni dans l'app ; l'éditeur le signale (plan, « Prêt à publier ? »), sans empêcher de publier.
- **Lié** (`linked`) : `{ id, type: "linked", templateId }`, au premier niveau d'un brouillon de contenu seulement (§ 2.5).

### 2.4 Dans une version publiée

La publication transforme le brouillon :
- chaque `linked` est remplacé par une **copie** du bloc unique du modèle ; la copie garde l'`id` du bloc lié, reçoit de nouveaux `id` à l'intérieur (si le même modèle apparaît deux fois, les `id` restent uniques) et porte un marqueur `"templateId"` ;
- chaque `alt` à `null` est remplacé par le texte alternatif actuel de la médiathèque (chaîne vide s'il n'y en a pas), et le bloc reçoit `"altFromLibrary": true`. Ce marqueur permet à « Revenir à cette version » de remettre `alt: null` (le bloc suit de nouveau la médiathèque) ; l'app l'ignore ;
- `files` fige les informations de chaque fichier cité (texte alternatif, transcription, dimensions, durée).

**Texte alternatif et transcription figés** **[D30]**. ADMIN § 6 présente ces informations comme propres au fichier. Avec ce choix, les corriger dans la Médiathèque change aussitôt les brouillons, mais ne change l'app qu'à la prochaine publication de chaque contenu concerné. La fiche du fichier le dit (« Déjà publié dans N contenus : ils garderont l'ancien texte jusqu'à leur prochaine publication »). Ce choix change le travail quotidien, d'où deux options (**B retenue le 27/09/2026**) :
- A) **Figé** (ci-dessus) : la copie figée d'ADMIN § 3 est tenue jusqu'au bout ; corriger une transcription oblige à republier chaque contenu ;
- B) **Figé, avec un raccourci** (ma proposition) : la fiche du fichier propose « Mettre à jour ces N contenus dans l'app », comme pour un bloc partagé (ADMIN § 5). Le geste écrit pour chaque contenu en ligne une nouvelle version, égale à la version en ligne, dont seuls les textes du fichier sont remplacés (`origin = 'files'`, sur le modèle de `template_push`, § 3.5). Le reste du brouillon ne part jamais par ce geste.

L'app ne voit que des blocs `text`, `image` et `box`, jamais `linked`.

### 2.5 Modèles de blocs

Les modèles sont des lignes `kind = 'template'` de `contents` : même éditeur, même verrou, même corbeille, même enregistrement automatique. Ils ne se publient pas.

| Sorte (ADMIN § 5) | Insertion | Modifier le modèle | Suppression |
|---|---|---|---|
| `style` (mise en forme) | copie des blocs, avec de nouveaux `id` | ne change rien ailleurs | libre (corbeille) |
| `starter` (point de départ) | le nouveau contenu s'ouvre avec une copie | ne change rien ailleurs | libre (corbeille) |
| `shared` (bloc partagé) | un bloc `linked` | **tous les brouillons le voient aussitôt**, puisqu'ils n'ont qu'une référence | refusée tant qu'un brouillon le cite |

- Un modèle `shared` contient **exactement un bloc** **[D11]**, validé le 27/09/2026 : pour en regrouper plusieurs, on les met dans un Encadré. C'est la lecture littérale de « le même bloc » (ADMIN § 5).
- Un modèle `starter` appartient à une sorte de contenu (`template_for`), choisie à sa création **[D42]** : « Nouvelle page » ne propose que les points de départ des pages.
- La sorte se choisit à la création et ne change plus (trigger).
- Deux modèles ne portent pas le même nom, quelle que soit leur sorte (index du titre unique, § 1.6 ; `titre_pris`, 10/10/2026, `…_noms_des_modeles.sql`).
- Une mise en forme insérée et un point de départ dont un contenu est créé sont des **copies sans lien** : l'admin note chaque copie dans `template_copies` (§ 1.12). Un bloc partagé reste lié (`draft_template_ids`).

### 2.6 Ajouter un bloc (SVG, animation Lottie, PDF…)

1. Ajouter sa définition au schéma, avec son `mediaId` (par exemple `svg` : `mediaId`, `alt` ; `animation` : `mediaId`, `loop`, `autoplay` ; `pdf` : `mediaId`, `label`). On ne fait **qu'ajouter** : un nouveau schéma ne revérifie pas les lignes existantes, donc on ne durcit jamais une règle déjà en place.
2. Lancer `blocks:generate` (types, validateurs, migration).
3. Admin : une entrée dans `web/src/blocks/registry.ts` (`type`, libellé, icône, `create()`, `allowedInBox`), son affichage (`BlockBody` de `web/src/blocks/components/block-canvas.tsx`) et ses réglages (`web/src/components/editor/block-settings.tsx`).
4. App (à faire avec l'app mobile) : une entrée dans `mobile/src/blocks/registry.tsx`.
5. Tests : cas valides et invalides partagés (`blocks/cases/*.json`) lus par Vitest et par pgTAP, plus le rendu.

Tant qu'une ancienne app ne connaît pas le bloc, elle affiche l'encart « Mets à jour l'app ». Grâce à `versions.block_types`, l'admin peut prévenir avant de publier un bloc récent.

### 2.7 Affichage dans l'admin

- **On écrit dans l'aperçu** (ADMIN § 4) : l'éditeur des contenus (`web/src/pages/editor-page.tsx`, plein écran, sans barre du haut) a trois colonnes. Au centre, le téléphone (`web/src/components/editor/feed-preview.tsx`, cadre `.blocks-device` de `preview.css`), où l'on choisit et écrit les blocs sur place (`BlockCanvas` de `web/src/blocks/components/block-canvas.tsx`) ; à gauche, **le plan** (`OutlinePanel`), toujours là, et par-dessus, en glissière, les Blocs (`blocks-library.tsx`, avec « Mes blocs ») ; à droite, la colonne « Article », « Épisode » ou « Page » (`article-panel.tsx`), et par-dessus les réglages du bloc choisi (`block-settings.tsx`). Chaque bloc Texte est une instance Tiptap (`text-block.tsx` : `immediatelyRender: false`, `shouldRerenderOnTransaction: false` ; `useEditorState` dans la barre de mise en forme, `format-toolbar.tsx`), non modifiable quand on n'a pas le verrou ou en Lecture. Le détail des écrans est dans CLAUDE.md (« Éditeur de blocs »).
- **Fidélité** : `blocks/blocks.tokens.json` décrit tailles de texte, espacements, couleurs et bordures des encadrés. `blocks:generate` en tire les variables CSS de l'aperçu (`tokens.css`) ; l'app lira les mêmes valeurs **[D12]** (ses constantes ne sont pas encore produites).
- **Glisser-déposer** (dnd-kit 6.3 / sortable 10), **dans le plan seulement** : le téléphone n'a pas de poignée. Le plan (`outline-panel.tsx`, `useBlockDrag` de `web/src/blocks/components/use-block-drag.ts`) a un `DndContext`, un `SortableContext` pour la liste principale et un par encadré, chacun entouré d'une zone de dépôt (pour déposer dans un encadré vide) ; les règles et la détection des cibles sont dans `web/src/blocks/dnd.ts` : un `box` ou un `linked` n'entre jamais dans un encadré. `DragOverlay`, `KeyboardSensor` + `sortableKeyboardCoordinates`, et des annonces dans la langue de l'admin pour les lecteurs d'écran (`texts.editor.dnd`).
  - **Le glisser-déposer part d'une poignée** (`useSortableItem` de `web/src/hooks/use-sortable-item.ts`), jamais de la ligne entière, et `PointerSensor` a une contrainte d'activation (`distance: 5`). « Monter », « Descendre » et « Sortir de l'encadré » font de même au clavier (`shiftBlock`, `canShift` de `web/src/blocks/draft.ts`). Un bloc des Blocs se glisse aussi dans le téléphone (glisser-déposer du navigateur, `web/src/lib/editor/library-drag.ts`).
- **Bloc partagé** (un bloc `linked`) : affiché tel qu'il est dans son modèle (`web/src/blocks/components/static-block.tsx`, sans Tiptap), avec « Modifier le modèle » et « Détacher du modèle » (copie ordinaire à la même place).
- Les SVG ne s'affichent qu'avec `<img>`, qui n'exécute jamais de script.

---

## 3. Règles tenues par la base, fonctions et tâches planifiées

> **En bref** : la base refuse elle-même tout ce qui est interdit : écrire sans la double vérification, écrire un brouillon tenu par quelqu'un d'autre, publier un bloc mal formé, supprimer un fichier ou un modèle utilisé, modifier une version publiée. Les gestes (enregistrer, publier, programmer, supprimer…) sont des fonctions de la base ; l'interface ne fait que les appeler.

### 3.1 Droits (RLS)

| Table | Lecture | Écriture directe | Le reste |
|---|---|---|---|
| `contents`, `versions` | `is_staff()` | **aucune** | tout par RPC |
| `edit_locks` | `is_staff()` | aucune | `lock_*` |
| `media` | `is_staff()` | `update (name, alt, transcript)` pour `is_staff()`, fichiers hors corbeille (droits par colonne) | envoi, corbeille, remplacement : RPC ; `status`, `is_public`, effacement : fonction Edge seulement (fonctions `files_*`) |
| `categories` | `is_staff()` | `is_staff()` (`insert`, `update`, `delete`) | `categories_reorder` |
| `content_categories` | `is_staff()` | aucune | `save_draft` |
| `access_levels` | `is_staff()` | `is_admin()` (`insert`, `update`, `delete`) | `access_levels_reorder` |
| `reader_access` | le lecteur, sa propre ligne | aucune pour `authenticated` ; clé secrète seulement | |
| `media_audit` | `is_staff()` | aucune | fonction Edge, tâche `audit-fichiers` |
| `template_copies` | `is_staff()` | `insert (template_id, content_id)` pour `is_staff()`, si le modèle est une mise en forme ou un point de départ et le contenu existe | |

`anon` n'a **aucun droit** sur ces tables, et un éditeur qui n'a pas passé la double vérification (aal1) non plus.

**Compte sans fiche d'équipe.** Toute la sécurité de l'admin repose sur `is_staff()`, c'est-à-dire sur l'existence d'une fiche `profiles`. `private.handle_new_user()` ne crée une fiche que si le rôle a été posé dans `app_metadata` par la clé secrète (invitation par la fonction `equipe`, ou premier admin posé à la main) : un compte lecteur, ou tout compte créé autrement, n'a pas de fiche et `is_staff()` est faux pour lui, même en aal2 (testé dans `10_equipe.test.sql`).

### 3.2 Triggers et fonctions internes

- **Brouillon** (`contents_30_draft`, `before insert or update of draft on contents`) :
  1. choisit la variante (`template` pour un modèle, `draft` sinon) et vérifie la forme ; refuse avec la liste des erreurs (`forme_invalide`, `brouillon_trop_lourd`, `brouillon_trop_imbrique`) ;
  2. vérifie l'unicité des `id` de blocs (`id_en_double`) ;
  3. recalcule `draft_media_ids` et `draft_template_ids` ;
  4. verrouille en partage les lignes `media` citées (`select … for share`), puis refuse un fichier inconnu, pas `ready` ou dans la corbeille (`fichier_indisponible`), et un modèle inconnu, dans la corbeille ou qui n'est pas `shared` (`modele_indisponible`). Le verrou de ligne empêche qu'un autre membre mette le même fichier à la corbeille pendant ce temps (`media_trash` prend `for update`, § 3.6) ;
  5. pour un modèle `shared`, au plus un bloc (`modele_un_seul_bloc` ; il naît vide), et il garde ce bloc tant qu'un brouillon le cite (`modele_utilise`) ; un bloc lié **ajouté** ne peut pas citer un modèle vide (`modele_vide`) **[D11]**.
- **`contents`** (`contents_10_kind`) : `id`, `kind`, `template_sort` et `template_for` immuables (`sorte_immuable`). `contents_05_list_position` donne sa place à un article ou un épisode neuf.
- **Garde de corbeille** sur `contents` (`contents_20_trash_guard`, `before update`) : un contenu dans la corbeille ne change pas (`dans_la_corbeille`), **sauf** dans trois cas, vérifiés colonne par colonne :
  1. `restore` (qui vide `deleted_at`) ;
  2. une colonne d'auteur (`created_by`, `draft_saved_by`, `deleted_by`, `scheduled_by`) qui passe à `null`, toutes les autres colonnes restant identiques : c'est l'effet de `on delete set null` quand on retire un membre de l'équipe ;
  3. `template_detach_all` (§ 3.5) et `media_replace` (§ 1.9), qui ne changent que le brouillon (`draft`, `draft_rev`, `draft_media_ids`, `draft_template_ids`, `draft_saved_at`, `draft_saved_by`). Ces fonctions le signalent par un réglage local à la transaction (`set_config('ruche.detach_all', 'on', true)`) ; aucune écriture directe n'étant permise sur `contents`, seul le code de la base peut le poser.
- **`versions`** : immuables (`versions_immutable`, `versions_no_truncate`), avec les deux exceptions du § 1.7.
- **`media`** : `before delete` refuse si `media_uses` n'est pas vide (seconde ligne de défense).
- **`access_levels`** : `before delete` refuse une formule encore utilisée (`formule_utilisee`, § 1.3).
- **`private.live`** (vue interne, jamais exposée) : toutes les versions **en ligne**, avec `content_id`, `kind`, `version_id` et le niveau (`level_id`, `level_rank`, `null` = gratuit) : un article, un épisode ou une page hors corbeille dont `live_version_id` est renseigné, avec le niveau de cette version. Toutes les autres fonctions (visibilité des fichiers, lecture de l'app, « où il est utilisé », modèles et textes à mettre à jour) s'appuient sur cette vue.

### 3.3 Enregistrement automatique et verrou

**Côté base**
- `lock_take(content_id, force, editor_session)` : réussit si le verrou est libre (`holder_id` nul), périmé, déjà à soi, ou si `force` (« Reprendre la main », après confirmation). Sinon ne change rien et renvoie le nom de la personne. `editor_session` identifie l'ouverture de l'éditeur (tirée au hasard à chaque ouverture) : le verrou est tenu par un membre **et** par cette ouverture, et les autres RPC du verrou et `save_draft` la reçoivent aussi.
- `lock_heartbeat(content_id, editor_session)` toutes les 20 s ; `lock_release(content_id, editor_session)` en quittant (`fetch(…, { keepalive: true })`), qui passe `holder_id` à `null` sans supprimer la ligne ; sinon le verrou expire au bout de **90 s** (`private.lock_ttl()`) **[D13]**.
- `lock_status(content_id, editor_session)` : nom de la personne et `draft_rev`, pour le repli sans Realtime.
- `save_draft(content_id, base_rev, draft, settings, editor_session)` : `settings` n'accepte que `slug`, `access_level_id` et `category_ids` (`reglages_invalides` sinon). Refuse `verrou_perdu` si l'appelant ne tient pas le verrou depuis cette ouverture, `conflit_revision` si `base_rev <> draft_rev`, `titre_pris` si une autre ligne de la section a ce titre (§ 1.6), `adresse_prise` si le `slug` est déjà celui d'une autre page, et tout contenu dans la corbeille. Sinon écrit, augmente `draft_rev`, recopie `draft_rev` dans `edit_locks` (ce qui vaut signe de vie), et renvoie la nouvelle révision. **Tous les réglages passent par là**, sous le verrou : personne ne peut changer le titre ou le niveau d'accès d'un brouillon qu'un autre est en train d'écrire. Aucun de ces réglages ne change l'app avant la publication, `slug` compris (§ 1.7). Un envoi rejoué après une réponse perdue reçoit la révision déjà enregistrée (contrat de l'étape 4).

**Côté admin** (`web/src/lib/editor/autosave.ts` et `edit-lock.ts`, sans React ; hooks `useAutosave` et `useEditLock`)
- Enregistrement 1,5 s après la dernière frappe, et au plus tard 10 s après la première. Une seule requête à la fois ; la plus récente attend son tour. Hors ligne : essais à 2, 4, 8, 15 puis 30 s, et tout de suite au retour en ligne.
- L'admin refuse d'envoyer un brouillon de plus de 240 000 octets (JSON compact) et prévient dès 200 000 (`web/src/blocks/draft.ts`).
- Le navigateur prévient avant de quitter la page si un changement n'est pas enregistré. La dernière révision connue est gardée par TanStack Query.
- **Signe de vie** : toutes les 20 s, **et aussitôt** que l'onglet redevient visible (`visibilitychange`). Chrome ralentit fortement les minuteries d'un onglet caché depuis plus de 5 minutes (environ une par minute) : avec une expiration à 90 s, un éditeur resté ouvert dans un onglet caché garde son verrou. Un onglet caché depuis plus de 30 minutes relâche volontairement le verrou ; au retour, l'éditeur tente de le reprendre, ou passe en lecture seule si quelqu'un d'autre l'a pris.
- **Realtime** (Postgres Changes, RLS réservée à l'équipe) sur `edit_locks` seulement, jamais sur `contents` **[D13]**. On n'écoute que les `INSERT` et `UPDATE` filtrés par `content_id=eq.…` : Postgres Changes ne sait pas filtrer les `DELETE` ni leur appliquer la RLS, c'est pourquoi la libération est un `UPDATE` :
  - celui qui lit voit le nom de celui qui écrit ; quand `draft_rev` change, il recharge le brouillon ; quand `holder_id` passe à `null`, il peut prendre la main ;
  - celui qui écrit voit aussitôt que quelqu'un a repris la main : l'éditeur passe en lecture seule, et ce qu'il n'avait pas encore enregistré reste dans son navigateur, avec « Copier mon texte » ;
  - si Realtime est coupé, l'admin revient à `lock_status` toutes les 30 s. Dans tous les cas, c'est la base qui tranche (`verrou_perdu`).
- En **Lecture** (le téléphone comme dans l'app), l'éditeur suit le verrou sans le prendre (CLAUDE.md, « La Lecture, comme dans l'app »).
- Presence n'est pas utilisé : il n'est pas stocké en base, qui ne pourrait donc pas s'en servir pour faire respecter le verrou.
- **Programmé** : quand le contenu a une publication programmée, l'éditeur affiche un bandeau permanent : ce qu'on écrit partira à cette heure (§ 3.8).

### 3.4 Publication

- **`publish(content_id, expected_rev)`** vérifie `is_staff()`, puis appelle `private.do_publish(content_id, auth.uid(), 'manual', expected_rev)`, qui :
  0. refuse un modèle (`sorte_invalide`), et un contenu dont le niveau d'accès n'a jamais été choisi (`access_chosen = false`) : `acces_a_choisir` **[D41]** ;
  1. refuse si un **autre** membre tient un verrou actif sur le contenu (`verrou_tenu`, son nom dans `hint`) : l'admin propose alors « Reprendre la main » **[D14]**. Un verrou libre ou le sien suffit ;
  2. refuse si `draft_rev <> expected_rev` (`conflit_revision`) ; l'admin termine d'abord son enregistrement en attente ;
  3. pour une page, exige un `slug` (`adresse_manquante`) qui n'est pas déjà celui d'une **autre page en ligne** (`adresse_prise`) ;
  4. prépare la version (`private.prepare_version`) : résout les blocs partagés (`modele_indisponible`) et les textes alternatifs, vérifie ce qu'exige la sorte (`private.check_publish_requirements` : un titre, `titre_manquant` **[D49]** ; l'image mise en avant d'un article ou d'un épisode, `image_de_presentation_manquante` **[D45]** ; le son d'un épisode, `son_manquant`), verrouille en partage les lignes `media` citées (`for share`, comme le déclencheur du brouillon) et vérifie les fichiers (`fichier_indisponible` : absent, pas `ready` ou dans la corbeille ; `fichier_inadapte` : pas une image dans un bloc Image ou en image mise en avant, pas un audio en son ; `image_sans_fichier`), fige `files`, `slug` et le nom de la formule, et valide avec la variante `published` (`forme_invalide`, `brouillon_trop_imbrique`) ;
  5. écrit la version (`private.insert_version`), met à jour `live_version_id`, `first_published_at` si c'est la première fois, et efface `scheduled_at` et `schedule_error`.
  Elle renvoie `needs_file_sync` : l'admin appelle alors aussitôt la fonction Edge `files` (§ 3.7).
- Le texte alternatif n'est **pas** obligatoire pour publier, et l'éditeur ne le réclame pas **[D15]**. La transcription d'un épisode est conseillée, pas exigée **[D46]**.
- **`unpublish(content_id)`** (« Retirer de l'app ») : `live_version_id = null`, programmation et échec effacés, historique gardé ; renvoie `needs_file_sync`. Refuse un modèle (`sorte_invalide`).
- **`schedule(content_id, at timestamptz)`** et **`unschedule(content_id)`** : article, épisode, page ; `at > now()` (`date_passee`). `schedule` vérifie déjà ce que la publication exigerait du brouillon enregistré (niveau choisi, titre, image, son, adresse d'une page) et enregistre `scheduled_by` et `scheduled_rev = draft_rev`. L'admin convertit l'heure du fuseau de l'admin en instant (`zoneToInstant` de `web/src/lib/dates.ts` : une heure qui n'existe pas au passage à l'heure d'été est refusée, l'heure doublée prend la première) ; la base compare avec `now()`, donc le fuseau GMT de pg_cron ne compte pas. La programmation publiera **le dernier brouillon enregistré à l'heure dite** **[D16]**, sauf si quelqu'un est en train de l'écrire à ce moment-là **[D31]** (§ 3.8) ; la barre de publication et le bandeau de l'éditeur le rappellent.
- **`revert_to_version(version_id, editor_session)`** (« Revenir à cette version ») : exige de tenir le verrou (`verrou_perdu`). Recopie dans le brouillon le `body`, le niveau, le `slug` et les catégories qui existent encore, puis :
  - retransforme en `linked` chaque copie marquée `templateId` dont le modèle `shared` existe encore **hors corbeille** avec exactement un bloc ; pour les autres, **retire le marqueur** : le bloc devient une copie ordinaire (avertissement `modele_detache`) ;
  - remplace par `null` tout `mediaId` d'un fichier **absent, dans la corbeille ou pas `ready`** (avec [D6], un fichier cité seulement par l'historique peut être dans la corbeille sans être encore effacé) ; le bloc affiche « Fichier supprimé, choisis-en un autre », et la publication le refuse tant qu'il en reste (avertissement `fichier_retire`) ;
  - remet `alt: null` sur chaque image marquée `altFromLibrary` (§ 2.4), et retire ce marqueur : le bloc suit de nouveau la médiathèque ;
  - si la formule de la version a été supprimée depuis, le niveau est **à choisir de nouveau** (`access_chosen = false`, avertissement `formule_supprimee`) ;
  - garde l'adresse du brouillon si celle de la version est prise par une autre page (`adresse_prise`), et renomme un titre repris depuis (`titre_renomme`).
  Augmente `draft_rev` ; ne publie rien.

### 3.5 Modèles

- **`content_create(kind, title, template_sort, from_template_id, template_for)`** : crée un contenu, dont l'appelant tient aussitôt le verrou ; avec un point de départ (`starter`) **de la même sorte** ([D42]), recopie ses blocs avec de nouveaux `id`. Refuse un titre pris (`titre_pris`).
- **`template_create_from(content_id, block_ids[], name, sort, template_for)`** : « Enregistrer comme modèle », à partir des blocs de premier niveau du brouillon enregistré. Pour `shared`, un seul bloc ; pour `starter`, sa section ([D42]) ; un nom pris est refusé (`titre_pris`).
- **`template_outdated(template_id)`** : les contenus **en ligne** dont une copie figée (marquée `templateId`), **encore liée dans le brouillon** (même `id`), diffère du bloc actuel du modèle. Un contenu où l'on a détaché le bloc justement pour qu'il ne suive plus le modèle n'est donc pas proposé, même tant qu'il n'a pas été republié. On compare les JSON sans les `id` ni les textes alternatifs figés. L'admin affiche « Mettre à jour ces N contenus dans l'app ».
- **`template_push(template_id)`** : pour chacun des contenus de `template_outdated`, écrit une nouvelle version = **la version en ligne** dont seules ces copies sont remplacées (`origin = 'template'`, auteur = le membre qui clique). Le reste du brouillon ne part jamais par ce geste.
- **Détacher** : dans l'éditeur, le `linked` devient une copie ordinaire (même `id` au premier niveau, nouveaux `id` à l'intérieur), enregistrée normalement.
- **`template_detach_all(template_id)`** (« Détacher partout ») : fait de même dans tous les brouillons, corbeille comprise (le garde de corbeille le permet, § 3.2). Refuse si l'un d'eux est tenu par un autre membre (`verrou_tenu`), et le nomme. Augmente `draft_rev` de chacun ; l'éditeur de l'appelant se recharge s'il est concerné. Le modèle devient ensuite supprimable.
- **Copies** : une mise en forme insérée ou un point de départ utilisé est noté dans `template_copies` par l'admin (§ 1.12).

### 3.6 Corbeille

- Vue **`trash_items`** (`security_invoker = true`) : `item_type` (`content` ou `file`), `id`, `kind`, `title`, `deleted_at`, `deleted_by_name`, `purge_at = deleted_at + 30 jours`, `purge_error`, pour les contenus (modèles compris) et les fichiers. Elle **exclut les fichiers dont l'effacement est déjà demandé** (`purge_requested_at` rempli). Le filtre par type se fait dans l'admin (`web/src/lib/trash.ts`).
- **`trash(content_id)`** : retire de l'app (`live_version_id = null`, programmation et échec annulés), libère le verrou, puis pose `deleted_at` ; renvoie `needs_file_sync`. Refuse si un autre membre écrit le contenu (`verrou_tenu`), et un bloc partagé cité par un brouillon (`modele_utilise`, avec la liste). Chaque contenu part seul. Le titre est libéré (§ 1.6).
- **`restore(content_id)`** : fait revenir le contenu demandé **en brouillon, sans republier** **[D18]** : publier reste un geste volontaire (ADMIN § 4). Une page dont l'adresse (`slug`) a été reprise entre-temps revient **sans adresse** (`adresse_retiree`) ; un contenu dont le titre a été repris revient renommé (`titre_renomme`, et la réponse donne le nouveau titre).
- **`media_trash(id)`** verrouille d'abord la ligne `media` (`for update`), puis refuse tant que `media_uses` n'est pas vide (`fichier_utilise`, avec la liste). Avec le `for share` du déclencheur du brouillon et de `publish`, un fichier ne peut pas être mis à la corbeille pendant qu'un autre membre l'insère.
- **`media_restore(id)`** : refuse un fichier dont l'effacement est déjà demandé.
- **`empty_trash(items jsonb default null)`** : efface définitivement la sélection (`[{ "type": "file" | "content", "id": "…" }]`), ou tout (`null`). Admin et éditeur. Renvoie le nombre d'éléments concernés ; l'admin appelle ensuite `files` (sans attendre sa réponse pour fermer la fenêtre de confirmation). **L'admin envoie toujours la liste explicite des éléments affichés**, même pour « Vider la corbeille » : un élément mis à la corbeille entre-temps par un autre membre n'est jamais effacé sans avoir été vu. `null` ne sert pas dans l'interface.
- **`private.purge_trash()`** : efface ce qui est dans la corbeille depuis plus de 30 jours. Les contenus et les modèles partent en SQL (la cascade emporte versions, catégories, copies notées et verrous). Pour les fichiers, elle ne fait que remplir `purge_requested_at` : un `DELETE` SQL sur `storage.objects` est bloqué par Supabase, c'est la fonction Edge qui efface par l'API Storage.

### 3.7 Une seule fonction Edge : `files`

Elle travaille avec supabase-js et la clé secrète **injectée par la plateforme** (`SUPABASE_SECRET_KEYS`, repli `SUPABASE_SERVICE_ROLE_KEY`, comme `equipe`), par lots de 50, et elle est **idempotente** (la base relit l'état à chaque changement, on peut la relancer sans risque). `verify_jwt = false` dans `config.toml`, comme `equipe`. **Aucun secret n'est saisi à la main** (ajustement du 27/09/2026) : elle distingue elle-même deux sortes d'appelants :
- **sans session de membre** : la tâche `fichiers` (pg_cron, via `net.http_post`), avec seulement la clé **publishable** dans l'en-tête `apikey`, comme le recommande la documentation Supabase pour appeler une fonction depuis pg_cron. Comme cette adresse et cette clé sont publiques, n'importe qui peut faire ce même appel : la fonction n'accepte alors que le mode `kick`, c'est-à-dire **le travail décidé par la base**, idempotent, et un **frein tenu en base** (`files_claim_run` : un `kick` toutes les 20 s ; sinon `429 trop_tot`). Un tel appel ne peut donc que faire plus tôt ce que la tâche aurait fait ;
- **un membre de l'équipe**, avec son JWT (`Authorization: Bearer`, ce que `functions.invoke` ajoute) : elle appelle `rpc('is_staff')` avec ce jeton (donc aal2 et session ouverte) avant d'agir, sinon `403`. Tous les modes, sans frein ; le mode `clean` (effacer des objets) lui est réservé (`401` sans membre). L'admin l'appelle juste après un envoi, une publication, une dépublication, « Vider la corbeille » ou « Nettoyer », pour que le changement soit immédiat.

**Comment elle parle à la base.** L'API n'expose que `public` et `graphql_public` : `rpc()` ne peut pas atteindre une fonction de `private`, même avec la clé secrète. La fonction passe donc par des fonctions `public.files_*` en `security definer`, dont l'`EXECUTE` est retiré à `public`, `anon` et `authenticated` et accordé à `service_role` seulement, comme `team_members()` à l'étape 2 :
- `files_claim_run(run_mode)` : le frein des appels sans membre ;
- `files_worklist(max_items)` : le travail à faire, dans l'ordre (`check`, `move` d'après `private.files_to_move()`, `purge`, `discard`), 50 au plus ; il refuse d'abord, sans toucher à l'objet, l'effacement d'un fichier encore utilisé ;
- `files_mark_checked(media_id, accepted, reason)`, `files_mark_check_failed(media_id, error)`, `files_mark_moved(media_id, is_public)`, `files_mark_failed(media_id, error)`, `files_mark_erased(media_id)` ;
- `files_audit()` (contrôle des orphelins, en SQL) et `files_orphans()` (ce que `clean` peut effacer).
Elles existent depuis l'étape 3, avec leurs tests de droits (`supabase/tests/20_…` et `23_…`).

Ses tâches :
1. **Vérifier** les fichiers `checking` (§ 4.3) et les passer à `ready` ou `rejected`.
2. **Déplacer** les fichiers donnés par `files_worklist()` (`move(path, path, { destinationBucket })`), puis mettre `is_public` à jour.
3. **Effacer** les fichiers dont `deleted_at` **et** `purge_requested_at` sont tous deux remplis quand la base relit la ligne (`remove()` dans les deux buckets), puis supprimer la ligne (`files_mark_erased`). Un fichier encore utilisé est écarté **avant** de toucher à l'objet (`files_worklist`) ; si la base refuse quand même la suppression (le trigger `before delete` trouve un usage apparu entre-temps), la fonction **n'insiste pas** : la base note la raison dans `purge_error`, vide `purge_requested_at`, et le fichier réapparaît dans la Corbeille avec « Effacement impossible : encore utilisé ».
4. **Nettoyer** les envois `pending` et les fichiers `rejected` de plus de 24 h (objet et ligne). `media_confirm` refuse un envoi de plus de 23 h (`envoi_expire`), pour qu'aucune confirmation ne croise ce nettoyage.
5. **Contrôle hebdomadaire** (tâche `audit-fichiers`, directement en SQL ; le mode `audit` de la fonction est retiré le 08/10/2026) : liste les objets des deux buckets dont le chemin n'est le `path` d'aucune ligne `media`, et écrit le résultat dans `media_audit`.
6. **Nettoyer les orphelins** (mode `clean`, sur demande d'un membre) : efface les objets du dernier contrôle, après avoir revérifié qu'ils n'ont toujours pas de ligne `media` et qu'ils ont plus de 24 h.

Déplacer et effacer sont des attentes réseau, pas du calcul : la limite de 2 s de processeur n'est pas en jeu. La vérification d'un SVG est une vraie analyse XML (environ 0,3 à 0,7 s pour 5 Mo) : un passage vérifie au plus 10 Mo de SVG et de Lottie, le reste attend le passage suivant. Un élément qui échoue n'est pas repris dans le même passage, et la base attend 10 minutes avant de le reproposer (`sync_failed_at`).

**Contrat pour l'interface** : `POST /functions/v1/files` avec `{ "mode": "kick" | "clean" }` (`kick` par défaut). Réponses : `200` avec un résumé (`kick` : `{ mode, checked, accepted, rejected, checkFailed, moved, erased, eraseRefused, failed, remaining }` ; `clean` : `{ mode, removed, orphans }`), sinon `{ error: { code, message } }` : `400 demande_invalide`, `401 non_connecte`, `403 reserve_a_l_equipe`, `405 methode_refusee`, `429 trop_tot`, `500 erreur_serveur`. Codes de refus d'un fichier (`media.reject_reason`) : `fichier_incoherent`, `fichier_trop_lourd`, `verification_impossible`, `svg_illisible`, `svg_element_interdit`, `svg_attribut_interdit`, `svg_lien_externe`, `lottie_illisible`, `lottie_invalide`, `lottie_lien_externe`.

### 3.8 Tâches planifiées (pg_cron)

Vercel Hobby ne lance ses tâches qu'une fois par jour, à une heure près : tout ce qui est fréquent se fait dans Supabase.

| Tâche | Fréquence | Action |
|---|---|---|
| `publications` | chaque minute | `private.run_due_publications()` : prend les contenus dont `scheduled_at <= now()` avec `for update skip locked`, et traite chacun dans son propre bloc d'exception (voir ci-dessous). Une programmation en retard (après une pause du projet) part au passage suivant. |
| `fichiers` | chaque minute | `private.kick_files()` : appelle la fonction Edge **seulement s'il y a du travail** (fichiers `checking`, `files_to_move()` non vide, effacements demandés, envois abandonnés). Quelques dizaines d'appels par jour au plus. |
| `corbeille` | chaque jour à 02:00 GMT | `private.purge_trash()` |
| `audit-fichiers` | chaque dimanche à 03:00 GMT | `private.audit_files()` : le contrôle des orphelins, directement en SQL (§ 1.11) |
| `menage` | chaque dimanche à 04:00 GMT | `private.housekeeping()` : efface `cron.job_run_details` de plus de 14 jours, les réponses `net._http_response` de plus de 7 jours (pg_net les efface déjà au bout de 6 h), les contrôles `media_audit` de plus de 90 jours (sauf le dernier) et les lignes de `edit_locks` sans signe de vie depuis plus d'un jour |

**Publication programmée pendant qu'on écrit** **[D31]**, rattachée à D16 (toutes deux validées le 27/09/2026). Pour chaque contenu dû, `run_due_publications` :
1. vérifie que `scheduled_by` est toujours dans `profiles` ; sinon, échec « auteur parti de l'équipe » ;
2. **attend si quelqu'un écrit** : si un membre, quel qu'il soit, tient un verrou actif sur le contenu **et** que ce brouillon a changé depuis la programmation (`draft_rev <> scheduled_rev`), elle ne publie pas cette minute-ci et réessaie à la suivante. Au bout d'une heure d'attente, échec « brouillon en cours d'écriture ». C'est la même prudence que D14 pour la publication manuelle, sans personne devant l'écran pour trancher ;
3. sinon, appelle `private.do_publish(content_id, scheduled_by, 'scheduled')`. La fonction interne n'a pas le garde `is_staff()`, qui serait toujours faux sous pg_cron (§ 1.1).
En cas d'échec (fichier supprimé, brouillon invalide, auteur parti, attente trop longue), elle remplit `schedule_error` et vide `scheduled_at` ; la liste de la section et l'éditeur l'affichent (« Programmation échouée »). Les autres options étaient de publier quand même (texte à moitié écrit possible) ou de publier la révision `scheduled_rev` (il faudrait la copier au moment de programmer, ce que D16 évite).

**Aucun secret, rien à régler à la main en ligne** (ajustement du 27/09/2026). L'adresse de la fonction `files` et la clé **publishable** (publique, déjà dans l'admin) sont rangées dans la table `private.settings` (une ligne, avec aussi l'heure des derniers passages pour le frein) :
- la **migration** y écrit des valeurs d'attente, que chaque installation remplace une fois par les siennes (adresse de sa fonction `files` et sa clé publishable ; `installation/README.md`, étape 3) ;
- `supabase/seed.sql`, qui ne tourne qu'en local (`start`, `db start`, `db reset`, jamais `db push`), les remplace par les valeurs **locales** : `http://kong:8000/functions/v1/files` (la passerelle, par son nom sur le réseau Docker de Supabase, joignable depuis le conteneur Postgres sous macOS comme sous Linux ; `host.docker.internal` ne l'est pas sur les machines Linux de GitHub) et la clé publishable locale.
La requête pg_net ne part qu'**après la validation** de la transaction (vérifié : une transaction annulée n'envoie rien). Le vrai passage pg_cron → pg_net → `files` est vérifié par `npm run functions:integration`.

### 3.9 Contre la mise en pause du projet gratuit

Un **workflow GitHub planifié** (`.github/workflows/garder-actif.yml`, « Garder le projet actif »), une fois par jour, appelle la fonction `public.ping()` de la base de la démo avec la clé publishable : c'est une vraie requête à la base, qui n'écrit rien **[D19]**. `ping()` ne lit rien ; elle fait partie de la liste fermée des fonctions exécutables par `anon` (§ 4.5). Aucun secret : ni `CRON_SECRET`, ni code dans `web/`. Un workflow planifié ne tourne que depuis `main`. Il n'est utile que tant qu'on est en offre gratuite ; on le retire au passage à Pro. (On ne sait pas si l'activité de pg_cron compte comme activité ; mieux vaut ne pas en dépendre.)

---

## 4. Fichiers : stockage et visibilité

> **En bref** : deux « tiroirs » de fichiers, l'un public, l'autre protégé. Tout arrive dans le tiroir protégé. Un fichier passe dans le tiroir public seulement quand un contenu gratuit publié l'utilise, et revient dans le tiroir protégé dès que ce n'est plus le cas. Les abonnés reçoivent des liens temporaires pour le tiroir protégé.

### 4.1 Deux buckets

| Bucket | Accès | Limite | Types acceptés |
|---|---|---|---|
| `files-public` | public (adresse fixe, sans jeton) | 50 MiB | `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`, `application/json`, `audio/mpeg`, `audio/mp4`, `application/pdf` |
| `files-protected` | privé (lien temporaire ou session) | 50 MiB | les mêmes |

- Liste de types **exacte**, pas de `image/*` ni `audio/*` **[D33]**. Les images que le navigateur sait lire dans un autre format (GIF, HEIC dans Safari…) ne sont pas refusées : la réduction des photos (§ 4.2) les convertit en WebP ou JPEG. Un GIF animé perd son animation, et l'admin le dit avant l'envoi (les animations passeront par Lottie). Les audios sont envoyés avec leur type normalisé (§ 1.9).
- Créés **par migration** (`insert into storage.buckets … on conflict (id) do update`), donc à l'identique en local et en ligne, et testés par `db:reset` **[D20]**. Ils ne sont pas déclarés dans `config.toml`, pour garder une seule source.
- Le chemin est `<media_id>/<nom-nettoyé>.<ext>`, **le même dans les deux buckets**.
- Un troisième bucket, `marque` (public), garde les logos et l'image de connexion de l'identité de l'admin : il ne sert pas aux contenus (CLAUDE.md, « L'identité de l'admin »).
- Les Lottie sont acceptés en `.json` seulement pour l'instant (pas `.lottie`, qui est une archive).

### 4.2 Envoi

1. **`media_create(kind, name, mime, size_bytes, width, height, duration_s)`** crée la ligne `pending` (`created_by = auth.uid()`) et la renvoie, avec son chemin. Elle refuse un SVG ou un Lottie de plus de 5 Mo.
2. **Préparation dans le navigateur** (`web/src/lib/media/prepare.ts`, code maison sans bibliothèque de compression) : le format est reconnu d'après les premiers octets, puis l'extension et le type annoncé ; les photos sont réduites à environ 300 Ko (`createImageBitmap` avec l'orientation de l'appareil photo, canvas, WebP, JPEG sur fond blanc si le navigateur rend autre chose que du WebP comme Safari, 2 000 px au plus sur le grand côté ; on baisse la qualité, puis la taille, sans descendre sous 800 px) ; un PNG ou un WebP déjà léger part tel quel ; un GIF est converti (première image, avertissement s'il est animé, détecté en parcourant ses blocs) ; un HEIC est converti si le navigateur sait le lire (Safari 17+), sinon un message dit de l'enregistrer en JPEG ; les SVG sont nettoyés (§ 4.3) et les Lottie vérifiés avec les mêmes règles que le serveur ; les types audio sont normalisés ; dimensions et durée sont lues.
3. **Envoi toujours dans `files-protected`**, avec `cacheControl: '60'` **[D21]** : standard jusqu'à 6 Mo, reprenable (TUS, `tus-js-client` 4.3.1) au-delà, pour les audios. Pas d'`upsert`. Attention : pour un `Blob` ou un `File`, storage-js **ignore** l'option `contentType` et envoie `blob.type` ; l'admin envoie donc toujours un `Blob` du type normalisé. L'envoi standard passe par `XMLHttpRequest` et non par `storage-js` (qui n'a ni progression ni annulation) : c'est la même requête que celle de storage-js pour un corps binaire (`POST /storage/v1/object/files-protected/<chemin>`, en-têtes `content-type`, `cache-control: max-age=60`, `x-upsert: false`). L'envoi reprenable vise en ligne `https://<réf>.storage.supabase.co/storage/v1/upload/resumable` (nom d'hôte direct recommandé par Supabase, ajouté à `connect-src` dans `web/csp.ts`), avec des morceaux de 6 Mo, une empreinte propre au chemin (on ne reprend jamais l'envoi d'un autre fichier) et le jeton relu avant chaque requête. Une annulation arrête l'envoi, puis la ligne `pending` est mise à la corbeille et son effacement demandé (sans passer par la page Corbeille).
4. **`media_confirm(id)`** vérifie dans `storage.objects` que l'objet existe (sinon `fichier_absent`, on peut réessayer), que sa taille et son type correspondent (sinon le fichier passe à `rejected`, raison `fichier_incoherent`), puis passe la ligne à `ready` (image, audio, PDF) ou `checking` (SVG, Lottie). Elle est rejouable. L'admin appelle aussitôt `files`, qui vérifie en quelques secondes.

**Politiques de `storage.objects`**
- `INSERT` sur `files-protected`, `to authenticated` : `(select public.is_staff())` **et** `name` est **exactement** le `path` d'une ligne `media` `pending` **créée par la même personne** (et non seulement son premier dossier). On ne peut donc déposer aucun autre objet dans le dossier pendant l'envoi.
- Aucune politique `UPDATE` ni `DELETE`, et aucune politique d'écriture sur `files-public` : seule la fonction Edge (clé secrète) déplace et efface.
- `SELECT` sur `files-protected` : voir § 4.5.

### 4.3 Vérification côté serveur des SVG et des Lottie

Le nettoyage se fait dans le navigateur, mais la base ne fait pas confiance au navigateur : un fichier `checking` ne peut entrer dans aucun bloc tant que la fonction Edge ne l'a pas passé à `ready`, et `status` n'est modifiable que par elle.
- **SVG** : la fonction **refuse** (sans réécrire) un fichier qui pourrait exécuter du code ou charger une ressource extérieure. Ce n'est pas une recherche de texte mais une vraie analyse XML (`@xmldom/xmldom` 0.9.12), avec une **liste blanche** d'éléments de l'espace de noms SVG (formes, texte, dégradés, masques, filtres `fe*`, `use`, `image`, `style`, `title`, `desc`, `metadata`…) : `script`, `foreignObject`, `iframe`, `embed`, `object`, `a`, `animate`, `set`… sont refusés, comme tout autre espace de noms, un attribut `on…`, une valeur `javascript:` (après décodage des références de caractères), un `href` / `xlink:href` qui n'est ni local (`#…`) ni, sur `image` et `feImage`, une image intégrée `data:image/(png|jpeg|webp);base64`, un `url()` non local ou un `@import` dans le CSS, une instruction `<?xml-stylesheet?>` et un DOCTYPE avec déclarations (entités). Dans le CSS (élément `<style>` ou attribut `style`), sont aussi refusés les fonctions qui chargent une image sans `url()` (`image-set()`, `-webkit-image-set()`, `image()`, `cross-fade()`, `element()`, `src()`) et toute chaîne (`'…'` ou `"…"`) qui ressemble à une adresse (`https:…`, `//…`, `data:…`). **Encodage** : le fichier est lu en UTF-8 strict (octets invalides refusés), et Storage le sert en `image/svg+xml` sans `charset`, donc le navigateur suit la déclaration `<?xml encoding?>` : sont refusés une déclaration d'un autre encodage que UTF-8 (un encodage à états comme ISO-2022-JP ferait lire au navigateur autre chose que ce que le serveur a vérifié), une déclaration ailleurs qu'au tout début, et les caractères hors XML 1.0 (contrôles C0 comme ESC, U+FFFE, U+FFFF). L'admin applique les mêmes règles (`web/src/lib/media/svg.ts`) et envoie toujours de l'UTF-8 sans prologue. Raisons : `svg_illisible`, `svg_element_interdit`, `svg_attribut_interdit`, `svg_lien_externe`.
  **Correction** : « un SVG passé par DOMPurify passe toujours » n'est vrai **qu'avec le réglage de l'admin**. Avec son seul profil SVG, DOMPurify garde `<style>@import…`, `<image href="https://…">`, `style="fill:url(https://…)"`, et retire tous les `<use>`. Réglage de l'admin (`web/src/lib/media/svg.ts`, étape 3) : retirer le prologue `<?xml?>`, refuser un DOCTYPE à déclarations et retirer un DOCTYPE simple, puis `sanitize(texte, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ["use"], FORBID_TAGS: ["a"] })` avec un hook `uponSanitizeAttribute` qui ne garde `href` / `xlink:href` que locaux (ou image intégrée sur `image` et `feImage`) et retire un attribut `style` qui contient un `url(` non local ou `@import`. Un second passage retire ce que le serveur refuserait encore (éléments hors de sa liste blanche, attributs d'autres espaces de noms, **élément `<style>` avec `@import`, `@font-face`, `url()` non local, `image-set()` et ses cousines, chaîne en forme d'adresse ou échappement CSS**), le résultat est écrit avec `XMLSerializer` (XML bien formé, espace de noms SVG ajouté s'il manque, pas d'entité HTML comme `&nbsp;`), puis vérifié avec les mêmes règles que la fonction `files` : un SVG qui ne pourrait pas être rendu acceptable est refusé avant l'envoi, avec la raison. **Écart voulu avec le premier réglage** : un `<style>` sans adresse extérieure est **gardé** (le serveur l'accepte), ce qui préserve les couleurs des exports Illustrator (`.st0 { fill: … }`) ; un `<style>` douteux est retiré en entier. Un SVG avec des caractères de contrôle est refusé avant l'envoi (`svg_illisible`). La sortie sur les fichiers types (Illustrator, Inkscape, icône, fichier piégé ; plus `encodage.svg` et `image-set.svg`, refusés par le serveur, le premier aussi par l'admin, le second nettoyé) de `supabase/functions/files/fixtures/` est comparée, dans `web/src/lib/media/svg.test.ts`, à `svg-nettoyes/` (que le test Deno fait accepter par le serveur) : identique, au `<style>` d'Illustrator près. Le parcours Playwright `web/e2e/mediatheque.spec.ts` envoie le fichier piégé pour de vrai : nettoyé, il passe à `ready`.
- **Lottie** : JSON valide, objet, avec `layers` (liste non vide), `w` et `h` (entiers de 1 à 8192), `fr` (> 0), `ip` et `op` (nombres, `op > ip`), selon la spécification Lottie 1.0.1 ; `v` (chaîne) ou `ver` (entier ≥ 10000) acceptés sans être exigés. Refus d'un asset qui n'est pas une image intégrée (`e = 1`, `p` en `data:image/(png|jpeg|webp);base64`) et d'une police chargée par adresse (`fPath`, `origin` ≠ 0). Raisons : `lottie_illisible`, `lottie_invalide`, `lottie_lien_externe`. Les « expressions » ne sont pas refusées : l'app ne les exécute pas.
- **Taille** : 5 Mo au plus pour les deux (`check` sur `media` et refus dans `media_create`, [D39]). Télécharger puis analyser un fichier de 50 Mo dépasserait la mémoire (256 Mo) ou les 2 s de processeur de la fonction.
- **Échecs répétés** : chaque vérification ratée (délai, erreur) augmente `check_attempts`. Au troisième échec, le fichier passe à `rejected` (« Vérification impossible ») : `kick_files` ne le rappelle pas sans fin.
- En cas de refus : `rejected`, avec la raison affichée dans la Médiathèque. Le fichier est nettoyé au bout de 24 h.

### 4.4 La règle « public ou protégé »

- **Règle** : un fichier doit être public **si et seulement s'il** figure dans `media_ids` d'une version de `private.live` dont le niveau réel est gratuit (`null`), **ou** s'il est le `cover_media_id` d'une version de `private.live`, quel que soit son niveau (question 1 du § 8.2, réponse B, décidée le 27/09/2026 : l'image mise en avant sert de vitrine). **[D24]**
- **`private.files_to_move()`** compare cette règle à `media.is_public` en une seule requête ensembliste, lue par la fonction Edge à travers `public.files_worklist()` (§ 3.7). Il n'y a aucune colonne « voulue » à tenir à jour.
- **Retour en protégé** : quand un contenu gratuit devient réservé et qu'on le republie, ses fichiers ne sont plus dans une version gratuite en ligne : la fonction Edge les déplace vers `files-protected`. Un fichier encore utilisé par un autre contenu gratuit en ligne reste public, puisque la règle le couvre toujours (exception prévue par ADMIN § 6).
- **Image mise en avant d'un contenu réservé** : elle est **toujours publique** tant que le contenu est en ligne (exception écrite dans ADMIN § 6, décidée le 27/09/2026). Les non-abonnés la voient dans les listes de l'app ; seuls les blocs et les autres fichiers restent protégés. Quand le contenu est retiré de l'app ou mis à la corbeille, elle redevient protégée si rien d'autre ne la rend publique.

### 4.5 Qui peut lire un fichier protégé

Deux politiques `SELECT` sur `files-protected` :
- `to authenticated using ((select public.is_staff()))` : l'équipe ;
- `to anon, authenticated using (private.reader_can_open(name))` : les lecteurs.

`private.reader_can_open(object_name)` (`security definer`, `stable`) lit l'`id` du fichier dans le premier dossier (s'il n'a pas la forme d'un UUID, elle renvoie faux), puis vérifie qu'une version de `private.live` qui cite ce fichier est gratuite **ou** d'un rang atteint par `private.reader_rank()`, **ou** en a fait son image mise en avant (`cover_media_id`, § 4.4). Le cas « gratuit » couvre la minute où un fichier gratuit attend encore d'être déplacé vers le bucket public : aucun trou d'affichage.

**Droits sur le schéma `private`.** Pour que la politique puisse appeler cette fonction, `anon` et `authenticated` reçoivent `usage` sur `private`. Or Postgres donne par défaut `EXECUTE` à `PUBLIC` sur toute nouvelle fonction : sans précaution, toutes les fonctions internes (`purge_trash`, `run_due_publications`, `kick_files`, `do_publish`…, en `security definer`) deviendraient exécutables par ces rôles. La migration de l'étape 3 écrit donc, avant de créer la moindre fonction dans `private` :
- `alter default privileges for role postgres revoke execute on functions from public;` — **global**, et non `in schema private` : des droits par défaut propres à un schéma ne peuvent qu'**ajouter** aux droits par défaut globaux, dont fait partie l'`EXECUTE` de `PUBLIC` ; la forme `in schema private` serait sans effet (constaté par le test pgTAP à l'étape 3). Dans `public`, rien ne change : Supabase y donne l'`EXECUTE` à `anon`, `authenticated` et `service_role` par ses propres droits par défaut, que chaque migration retire fonction par fonction ;
- `revoke execute on all functions in schema private from public, anon, authenticated;`
puis ne rend `execute` qu'à `private.reader_can_open` ; `private.reader_rank` n'est appelée que par des fonctions `security definer`. Un test pgTAP (`supabase/tests/05_prive.test.sql`) vérifie qu'aucune autre fonction de `private` n'est exécutable par `anon` ni `authenticated`, et que dans `public`, `anon` n'exécute qu'une **liste fermée** : `ping()`, `admin_brand()` et `admin_brand_variants()` (l'identité de l'admin, pour la page de connexion) et les lectures de l'app `app_*` (§ 5.1). Une nouvelle `app_*` s'ajoute à cette liste.

L'app appelle elle-même `createSignedUrls(paths, durée)` avec sa session (anonyme ou abonné) : la base décide, aucune fonction Edge n'est consommée.

### 4.6 Cache et anciennes adresses

- L'offre gratuite a le CDN « basique » : sans vidage possible, une ancienne adresse publique peut encore marcher pendant la durée du `cacheControl`. Avec **60 s** (réponse B de la question 5, décidée le 27/09/2026), un fichier redevenu protégé (ou effacé) reste joignable **1 minute au plus** à son ancienne adresse publique, plus la minute au plus avant que la tâche `fichiers` ne le déplace quand l'admin n'a pas pu appeler `files` lui-même : **2 minutes au pire**. Storage enregistre `max-age=60` et l'adresse publique renvoie `Cache-Control: max-age=60`.
- Cette fenêtre de deux minutes au plus est écrite dans ADMIN § 6 (question 5, réponse B, décidée le 27/09/2026). Le Smart CDN de l'offre Pro la ramène à environ 60 s.
- Comme un fichier ne se remplace jamais (§ 1.9), un cache court ne ralentit pas l'app : elle garde ses images en cache par `id`.

---

## 5. Ce que lira l'app mobile

> **En bref** : l'app demandera « la liste des articles », « ce contenu », « cette page »… La base ne répond qu'avec ce qui est publié, et ne donne le contenu réservé qu'aux abonnés du bon niveau. **Les lectures du § 5.1 existent déjà dans la base** ; l'app mobile, elle, n'est pas encore construite : les §§ 5.2 à 5.4 décrivent ce qu'elle fera. La façon dont les lecteurs auront un compte et un abonnement reste à décider avec le paiement.

### 5.1 Les fonctions de lecture

Des RPC `security definer`, `stable`, au `search_path` vide, exécutables par `anon` et `authenticated`, qui ne lisent que `private.live`. Toutes renvoient `null` (ou aucune ligne) pour ce qui n'est pas en ligne (brouillon jamais publié, retiré, dans la corbeille, inconnu).

| RPC | Renvoie |
|---|---|
| `app_feed(section, category_id = null, before = null, lim = 20)` | `{ items, nextCursor }` : les articles (`blog`) ou les épisodes (`podcasts`) en ligne, dans l'ordre de leur section (`list_position` puis `id`, **[D47]**), 1 à 50 par page. Chaque élément : `{ id, versionId, kind, title, cover, files, categoryIds, level, locked, durationS, publishedAt, firstPublishedAt }` ; `files` ne contient que l'image mise en avant (toujours publique), `durationS` la durée du son d'un épisode. Jamais de blocs ni de son. `category_id` filtre sur les catégories de la version en ligne. `nextCursor` (« place~id », texte opaque) se renvoie dans `before` ; `null` à la dernière page. |
| `app_content(content_id)` | `{ id, versionId, kind, title, cover, slug, level, locked, blockTypes, blocks, audio, files, categoryIds, publishedAt, firstPublishedAt }`. `level` : `{ id, name, rank }` ou `null` (gratuit). `locked` vaut vrai si le contenu est réservé et que la formule du lecteur (`reader_access`, en cours de validité) n'atteint pas le rang voulu ; alors `blocks` et `audio` valent `null` et `files` ne contient que l'image mise en avant. `files` : `mediaId → { kind, mime, path, alt, transcript, width, height, durationS }`, figés à la publication. `categoryIds` : seulement les catégories qui existent encore, dans leur ordre. **L'emplacement (public ou protégé) n'y figure pas** : il peut changer sans nouvelle version. |
| `app_page(slug)` | la page **en ligne** dont la version porte ce `slug` (`versions.slug`), dans la même forme que `app_content`. Changer l'adresse dans le brouillon ne change rien avant la publication. |
| `app_file_locations(media_ids uuid[])` | lignes `{ media_id, location }` (`public` ou `protected`), seulement pour les fichiers que l'appelant a le droit de voir (cités par une version en ligne gratuite, ou d'un rang qu'il atteint, ou image mise en avant d'une version en ligne) ; 500 identifiants au plus (`demande_invalide`). |
| `app_categories(section)` | lignes `{ id, name }` des catégories de la section, dans l'ordre de l'équipe ; section inconnue : `demande_invalide`. |
| `app_access_levels()` | lignes `{ id, name, rank }`, par rang. |

Pas encore de lecture pour les méthodes : elle viendra avec leur nouvelle structure (§ 1.8).

`versionId` sert de clé de cache pour `app_content` (TanStack Query côté app) : il change à chaque publication. `app_file_locations` n'est gardé en cache qu'une minute.

### 5.2 Fichiers

- L'emplacement d'un fichier peut changer sans que la version du contenu change : le fichier F sert à l'article gratuit A et à l'article réservé B ; quand on retire A de l'app, F redevient protégé, mais la version de B reste la même. D'où `app_file_locations`, appelé à part et gardé une minute seulement.
- **Public** : l'app calcule l'adresse avec `getPublicUrl` (aucun appel réseau).
- **Protégé** : `createSignedUrls(paths, 3600)` pour les images et PDF, 6 h pour un audio **[D22]**.
- **En cas d'échec** de chargement (fichier déplacé entre-temps), l'app essaie l'autre emplacement (adresse publique, puis lien temporaire, ou l'inverse) et invalide `app_file_locations`.
- `expo-image` avec `cacheKey = mediaId`, pour que le cache survive au changement de jeton et d'emplacement.

### 5.3 Affichage

- **Registre des blocs** `mobile/src/blocks/registry.tsx`, avec les validateurs générés (fichier autonome, § 2.1) : un bloc invalide ou inconnu devient l'encart « Mets à jour l'app ».
- **Texte** : un rendu maison récursif du JSON restreint (une centaine de lignes, sans dépendance) : `<Text>` imbriqués pour le gras, l'italique et les liens (ouverts avec `expo-web-browser`), `<View>` pour les listes. Tiptap ne tourne pas en natif, et les bibliothèques existantes sont peu suivies.
- **Image** : `expo-image`, avec la place réservée grâce aux dimensions. **Encadré** : `<View>` avec les constantes de `blocks.tokens.json`.
- À venir : SVG avec `react-native-svg` 15.15.4 (plus fiable qu'`expo-image` sur iOS pour certains arcs), Lottie avec `lottie-react-native` ~7.3.8 (à vérifier avec `npx expo-doctor`), son avec `expo-audio`, PDF ouvert avec `expo-web-browser`. Tous s'installent avec `npx expo install`.

### 5.4 Lecteurs et paiement

- ADMIN § 10 remet le paiement à plus tard. `reader_access` n'est qu'un support provisoire ([D37], § 1.4) : sa forme et la façon de la remplir (par exemple une fonction Edge qui recevrait les notifications du service de paiement) seront décidées avec lui.
- **Comptes lecteurs** : les inscriptions sont fermées dans Supabase (ADMIN § 2), alors que les abonnés auront besoin d'un compte. C'est la question encore ouverte du § 8.2 : dans le même projet Supabase, ou ailleurs.
- **Si c'est dans le même projet**, la sécurité de l'admin n'est tenue qu'à une condition, écrite noir sur blanc : `handle_new_user()` ne crée une fiche d'équipe **que pour une invitation** (§ 6.0, point 1). C'est le cas depuis l'étape 2 : un lecteur inscrit n'a aucune fiche d'équipe.

---

## 6. Plan de construction par étape (3 à 7) : migrations, écrans, tests

> **En bref** : l'admin s'est construite en cinq étapes, chacune livrée avec ses migrations, ses écrans et ses tests. Ce chapitre ne garde que ce qui sert encore : les fondations (§ 6.0) et, pour chaque étape, **le contrat de la base** tel qu'il est aujourd'hui (signatures, réponses, codes d'erreur). Le plan de chaque étape, ce qui a été fait et les écarts sont dans [le journal archivé](archives/journal-construction.md).

Pour toutes les RPC de l'admin : un membre en aal2 est exigé (sinon code `42501`, message `reserve_a_l_equipe` ; `reserve_aux_admins` pour `access_levels_reorder`) ; les autres erreurs ont le code `P0001`, un `message` stable, un `detail` en français pour les journaux et, au besoin, des faits dans `hint` (§ 1.1). PostgREST les rend en `{ code, message, details, hint }`.

### 6.0 Ce qui doit exister dès l'étape 3

1. **Une fiche d'équipe seulement sur invitation** : `private.handle_new_user()` ne crée une fiche que si `app_metadata.role` a été posé par la clé secrète ; un compte non invité n'a pas de fiche et `is_staff()` est faux pour lui même en aal2 (test pgTAP). Le premier admin est créé à la main (ADMIN § 2) ; en local, les tests créent leurs comptes avec ce repère.
2. Le schéma `private`, ses droits par défaut (§ 4.5), la façon d'écrire les RPC (§ 1.1) et les codes d'erreur.
3. Les extensions `pg_cron`, `pg_net` et `pg_jsonschema`. pgTAP reste réservé aux tests.
4. Les deux buckets des fichiers, le chemin `<id>/<nom>`, `cacheControl: '60'`, les politiques Storage (§ 4).
5. La fonction Edge `files` (vérifier, déplacer, effacer, nettoyer), ses fonctions `public.files_*` réservées à `service_role`, la table de réglages `private.settings` (adresse de `files` et clé publishable : valeurs d'attente dans la migration, remplacées une fois par chaque installation, `installation/README.md` ; valeurs locales dans le seed ; aucun secret), les tâches `fichiers`, `corbeille`, `audit-fichiers` et `menage` (§ 3.8).
6. Les colonnes de corbeille, la vue `trash_items` et la page Corbeille, générique **[D38]**.
7. La convention `mediaId`, `private.media_uses()` et `private.files_to_move()` (§ 1.9, § 4.4).
8. Des **aides pgTAP** pour simuler un anonyme, un éditeur aal1, un éditeur aal2, un admin et un **lecteur** (un compte sans fiche, avec ou sans ligne `reader_access`), en réglant `request.jwt.claims`. Elles sont dans `supabase/tests/aides/roles.inc`, inclus par chaque test après `begin;` (`\ir aides/roles.inc`) ; `supabase test db` lance **tous** les fichiers `.sql` et `.pg` de `supabase/tests`, sous-dossiers compris, chacun dans sa propre session, et l'extension `.inc` n'est pas lancée. Pour la publication, `aides/publication.inc`.
9. **Un test de droits par table**, sur le modèle de `10_equipe.test.sql` : pour chacun des cinq profils ci-dessus, ce qu'il peut lire et écrire (`table_privs_are`, `column_privs_are`, puis des lectures et écritures réelles sous chaque rôle), et `function_privs_are` pour chaque RPC.
10. **Types générés** (ADMIN § 9) : `cd web && npm run db:types` régénère `web/src/lib/database.types.ts` depuis la base locale (`supabase gen types typescript --local`, puis Prettier), **après chaque migration**. L'équivalent pour `mobile/` viendra avec l'app.
11. **Tests automatiques sur GitHub** (ADMIN § 8) : voir le tableau ci-dessous.

**Garde-fous** (`.github/workflows/garde-fous.yml`, sur chaque demande de fusion ; la règle de `main` exige les quatre, CLAUDE.md)

| Job | Ce qui tourne |
|---|---|
| « Administration » | `blocks:generate` puis aucun fichier modifié ni nouveau (forme des blocs à jour, § 2.1), Prettier, ESLint, code inutilisé, copier-coller, Vitest, types et construction |
| « Base de données » | `supabase db start` (migrations de Storage comprises, pg_cron et pg_net dans l'image), tests pgTAP, empreinte du schéma des blocs (`select private.blocks_schema_hash()` comparé à `blocks/generated/schema.sha256`), contrôle des types générés (`db:types` puis `git diff --exit-code`) |
| « Fonctions serveur » | tests Deno d'`equipe` et de `files` (`npm run functions:test`), puis Supabase démarré avec Storage, la passerelle et les fonctions, et les tests d'intégration de `files` (`npm run functions:integration` : vrais envois, vrai passage de la tâche `fichiers`) |
| « Parcours » | Supabase local avec le seed (les réglages locaux de la tâche `fichiers`), Storage, Realtime et les fonctions ; l'admin construite puis servie, et Playwright. Les comptes de test et leurs secrets de double vérification sont créés par les tests eux-mêmes (`web/e2e/support/accounts.ts`, `supabase/tests/aides/roles.inc`) |

Vercel ne met en production que si « Administration » et « Base de données » sont au vert (Deployment Checks) : un job renommé doit l'être aussi dans Vercel et dans la règle de `main`.

### Étape 3 : Médiathèque

Plan, réalisation et écarts : [journal archivé](archives/journal-construction.md), « Étape 3 ».

**Contrat de la base pour l'interface (partie `supabase/`)**

| RPC | Renvoie | Erreurs |
|---|---|---|
| `media_create(kind, name, mime, size_bytes, width?, height?, duration_s?)` | la ligne `media` créée (`status = 'pending'`, `path`) | `type_refuse`, `nom_invalide`, `fichier_vide`, `fichier_trop_lourd`, `fichier_invalide` |
| `media_confirm(media_id)` | la ligne : `ready`, `checking` (SVG, Lottie), ou `rejected` / `fichier_incoherent` ; rejouable | `fichier_introuvable`, `fichier_absent` (réessayer), `envoi_expire` |
| `media_trash(media_id)` | la ligne, dans la corbeille ; rejouable | `fichier_introuvable`, `fichier_utilise` (`hint` : les contenus) |
| `media_restore(media_id)` | la ligne, hors corbeille ; rejouable | `fichier_introuvable`, `effacement_demande` |
| `empty_trash(items?)` | nombre d'éléments concernés ; `items` = `[{ "type": "file" \| "content", "id": "…" }]`, ou rien pour tout. Contenus : effacés tout de suite (cascade : versions, catégories, copies notées, verrou), seulement s'ils sont dans la corbeille ; fichiers : effacement demandé. Appeler ensuite `files` | `demande_invalide` |
| `media_uses(media_id)` | lignes `{ content_id, kind, title, in_draft, in_app }` : brouillons (contenus, modèles, corbeille comprise) et versions en ligne | |
| `media_in_use(media)` | colonne calculée (`select=*,media_in_use`), § 1.9 | |
| `media_storage_used()` | octets occupés dans les deux buckets | |
| `media_outdated(media_id)` | lignes `{ content_id, kind, title, version_id, version_number, published_at }` : les contenus **en ligne** dont la version cite ce fichier avec un texte figé différent de la médiathèque ([D30]) | |
| `media_push(media_id)` | lignes `{ content_id, version_id, version_number }` : pour chacun, une version **égale à la version en ligne** dont seuls les textes de ce fichier sont remplacés (`origin = 'files'`), mise en ligne ; rejouable (0 ligne) | `fichier_introuvable` |
| `media_replace(old_id, new_id)` | `{ replaced, kept }` : le nombre de brouillons changés, et ceux gardés parce qu'un autre les écrit (`id`, `title`, `holder`) **[D48]** | `demande_invalide`, `fichier_introuvable`, `fichier_pas_pret`, `type_different` |
| `media_replace_live(old_id, new_id)` | lignes `{ content_id, version_id, version_number }` : une nouvelle version (`origin = 'files'`) de chaque contenu en ligne qui cite l'ancien fichier **[D48]** | les mêmes que `media_replace` |

- **Lecture** : `media` (toutes les colonnes), `media_audit` (le dernier contrôle : `order by checked_at desc limit 1`) et la vue `trash_items` (§ 3.6).
- **Écriture directe** : seulement `update` de `name`, `alt` (images, SVG) et `transcript` (audios) sur un fichier hors corbeille ; les textes sont nettoyés (espaces autour, texte vide → `null`).
- **Envoi** : `upload(path, new Blob([fichier], { type: mime }), { cacheControl: "60", upsert: false })` dans `files-protected`, au chemin exact renvoyé par `media_create` (l'admin fait la même requête avec `XMLHttpRequest`, pour la progression et l'annulation, § 4.2) ; TUS au-delà de 6 Mo avec les mêmes `bucketName`, `objectName`, `contentType` et `cacheControl`.
- **Fonction `files`** : voir le contrat au § 3.7. Après un envoi, `trash` (si `needs_file_sync`), `empty_trash` ou « Nettoyer » : `kickFiles()`, puis relire.

### Étape 4 : Éditeur de blocs

Plan, réalisation et écarts : [journal archivé](archives/journal-construction.md), « Étape 4 ».

**Contrat de la base pour l'éditeur (étape 4)**

| RPC | Renvoie | Erreurs |
|---|---|---|
| `content_create(kind, title? = '', template_sort?, from_template_id?, template_for?)` | la ligne `contents` créée (un objet) ; l'appelant tient aussitôt le verrou. Brouillon `{ v: 1, title, cover: null, audio: null, blocks: [] }`, ou les blocs d'un point de départ recopiés avec de nouveaux `id` (encadrés compris) | `sorte_invalide` (sorte inconnue ; `template_sort` manquant pour un modèle ou présent pour un autre ; `template_for` manquant, en trop ou inconnu), `demande_invalide` (titre de plus de 200 caractères), `titre_pris`, `modele_indisponible` (point de départ absent, pas `starter`, dans la corbeille, ou d'une autre sorte) |
| `save_draft(content_id, base_rev, draft, settings?, editor_session?)` | une ligne `{ draft_rev, draft_saved_at }` (`.single()`) ; recopie `draft_rev` dans `edit_locks` et vaut signe de vie. Il faut tenir le verrou **depuis la même ouverture** (`editor_session`). Rejeu d'un envoi dont la réponse s'est perdue : si `base_rev + 1` est la révision en base, enregistrée par l'appelant avec exactement ce brouillon et que tous les réglages envoyés sont déjà en place, renvoie cette révision au lieu de `conflit_revision` | `demande_invalide` (argument manquant, `settings` pas un objet), `contenu_introuvable`, `dans_la_corbeille`, `verrou_perdu`, `conflit_revision`, `reglages_invalides`, `titre_pris`, `niveau_invalide`, `adresse_invalide`, `adresse_prise`, `categorie_invalide`, et celles du brouillon ci-dessous |
| `lock_take(content_id, force? = false, editor_session?)` | une ligne `{ mine, holder_id, holder_name, taken_at, heartbeat_at, is_active, draft_rev }` (`.single()`). Réussit (`mine` vrai) si le verrou est libre, périmé (plus de 90 s), déjà à soi (même depuis une autre ouverture : l'ancienne perd la main), ou avec `force` ; sinon ne change rien et nomme la personne (`holder_name` : nom, sinon e-mail) | `contenu_introuvable`, `dans_la_corbeille` |
| `lock_heartbeat(content_id, editor_session?)` | `true` si l'appelant tient encore le verrou depuis cette ouverture (même périmé mais pas repris), sinon `false` : passer en lecture seule | |
| `lock_release(content_id, editor_session?)` | `true` si l'appelant le tenait depuis cette ouverture ; la ligne reste (`holder_id`, `holder_session` et `taken_at` à `null`). Fermer un vieil onglet ne retire donc pas la main au nouveau | |
| `lock_status(content_id, editor_session?)` | la même ligne que `lock_take`, sans rien changer (repli toutes les 30 s, et juste après l'abonnement Realtime) | `contenu_introuvable` |
| `content_title_taken(kind, title, except_id?)` | lignes `{ taken_id, taken_title }` : le contenu de la même section, hors corbeille, qui porte déjà ce titre (§ 1.6) ; vide sinon | |

- **Erreurs du brouillon** (déclencheur, pour `save_draft`, `content_create` et `revert_to_version`) : `brouillon_trop_lourd` (plus de 262 144 octets **mesurés sur `jsonb::text`**, environ 8 % de plus que `JSON.stringify` : l'admin s'arrête à 240 000 octets compacts), `brouillon_trop_imbrique` (plus d'environ 29 niveaux de listes), `forme_invalide` (le `detail` donne les trois premiers messages de pg_jsonschema, sans chemin : l'admin montre plutôt ceux de `validateDraft`), `id_en_double` (encadrés compris), `fichier_indisponible` (inconnu, pas `ready` ou dans la corbeille), `modele_indisponible` (bloc lié vers autre chose qu'un modèle `shared` hors corbeille), et pour les blocs partagés `modele_vide`, `modele_un_seul_bloc`, `modele_utilise` (étape 6).
- **`settings`** (clés facultatives ; une clé absente ne change rien) : `slug` (`^[a-z0-9]+(-[a-z0-9]+)*$`, 100 caractères au plus, ou `null` ; pages seulement ; unique parmi les pages hors corbeille), `access_level_id` (`null` = Gratuit, ou l'identifiant d'une formule ; dans les deux cas `access_chosen` devient vrai ; article, épisode, page), `category_ids` (liste d'UUID ; remplace la liste, `[]` pour aucune ; Blog pour un article, Podcasts pour un épisode, aucune pour les autres). Toute autre clé : `reglages_invalides`.
- **Forme exigée par le schéma**, à respecter par Tiptap et `cleanTextDoc` : `id` en UUID minuscule ; lien `{ type: "link", attrs: { href } }` seulement, `href` commençant par `https://` ou `mailto:` (sensible à la casse, sans espace) ; `orderedList` avec `attrs` absent ou `{ start }` (entier de 1 à 99 999) ; `listItem` qui commence par un `paragraph`, suivi seulement de paragraphes et de listes (**pas de titre dans une liste**) ; `heading` avec `attrs.level` 2 ou 3 ; nœud `text` non vide ; `paragraph` et `heading` sans `content` acceptés ; `doc.content` jamais vide ; image avec les trois clés `mediaId`, `caption` (300 caractères au plus, comptés en points de code) et `alt` (1 000 au plus), chacune pouvant valoir `null` ; encadré `look` `fill` ou `border`, `blocks` de Texte et d'Image seulement (liste vide permise) ; racine `v: 1`, `title` (200 au plus, vide permis), `blocks`, et facultatifs `cover`, `audio` (`null` ou `{ mediaId }`), rien d'autre.
- **Lecture directe** : `contents`, `edit_locks`, `content_categories` et `categories` (équipe en aal2). **Écriture directe** : seulement `categories` (`insert` de `section`, `name`, `position` ; `update` de `name`, `position` ; `delete`) ; le nom est nettoyé (espaces du bord, NFC), la position manquante mise en fin de section, un nom en double dans une section refusé (`23505`), un nom vide ou de plus de 100 caractères refusé (`23514`), la section ne change pas.
- **Realtime** : `postgres_changes` sur `public.edit_locks`, `event: '*'` (en pratique `INSERT` et `UPDATE`), `filter: 'content_id=eq.<id>'`. `payload.new` est la ligne entière (`content_id`, `holder_id`, `holder_session`, `taken_at`, `heartbeat_at`, `draft_rev`) mais pas le nom : le relire par `lock_status`. Chaque signe de vie (toutes les 20 s) envoie un `UPDATE`. On ignore les `DELETE` (ménage hebdomadaire des lignes sans signe de vie depuis plus d'un jour : ils ne sont ni filtrés ni soumis à la RLS). L'admin appelle `supabase.realtime.setAuth()` avant de s'abonner (le jeton aal2 n'est pas donné à Realtime après la double vérification) et relit `lock_status` juste après `SUBSCRIBED`.

### Étape 5 : Publication

Plan, réalisation et écarts (parties n° 1 et n° 2, partie admin) : [journal archivé](archives/journal-construction.md), « Étape 5 ».

**Contrat de la base pour l'admin (étape 5, partie n° 1)**

| RPC | Renvoie | Erreurs |
|---|---|---|
| `publish(content_id, expected_rev)` | une ligne `{ version_id, version_number, published_at, needs_file_sync }` (`.single()`). `expected_rev` : la révision que l'admin vient d'enregistrer ; si `needs_file_sync`, appeler `kickFiles()` | `demande_invalide`, `contenu_introuvable`, `dans_la_corbeille`, `sorte_invalide` (modèle), `acces_a_choisir`, `verrou_tenu` (un **autre** membre écrit depuis moins de 90 s : `hint` donne son nom, proposer « Reprendre la main »), `conflit_revision`, `adresse_manquante`, `adresse_prise` (une autre page **en ligne** a cette adresse), `modele_indisponible`, `titre_manquant`, `image_de_presentation_manquante`, `son_manquant`, `fichier_indisponible`, `fichier_inadapte`, `image_sans_fichier`, `forme_invalide`, `brouillon_trop_imbrique` (ordre du § 3.4) |
| `unpublish(content_id)` | `needs_file_sync` (booléen) ; plus de version en ligne, programmation (et échec) effacée, historique gardé ; rejouable | `contenu_introuvable`, `sorte_invalide` (modèle), `dans_la_corbeille` |
| `schedule(content_id, at)` | l'instant enregistré (`timestamptz`) ; remplace une programmation ; `scheduled_by`, `scheduled_rev` remplis, `schedule_error` effacé | `demande_invalide`, `contenu_introuvable`, `dans_la_corbeille`, `sorte_invalide`, `acces_a_choisir`, `adresse_manquante`, `date_passee` (`at <= now()`), et ceux de `private.check_publish_requirements` (`titre_manquant`, `image_de_presentation_manquante`, `son_manquant`) |
| `unschedule(content_id)` | vrai si une programmation ou un échec a été effacé, faux sinon (rejouable) | `contenu_introuvable`, `dans_la_corbeille` |
| `revert_to_version(version_id, editor_session?)` | une ligne `{ draft_rev, draft_saved_at, warnings }` : ne publie rien ; `warnings` ⊂ `titre_renomme`, `fichier_retire`, `modele_detache`, `formule_supprimee` (niveau à choisir de nouveau), `adresse_prise` (l'adresse du brouillon est gardée) | `version_introuvable`, `dans_la_corbeille`, `verrou_perdu` (il faut tenir le verrou depuis cette ouverture), `titre_pris`, `adresse_prise`, puis celles du brouillon |
| `access_levels_reorder(ids uuid[])` | les formules dans le nouvel ordre (lignes) ; `ids` = toutes les formules, chacune une fois | `reserve_aux_admins`, `demande_invalide` |

- **Écriture directe des formules** (admins) : `insert` du seul `name` (rang en fin de liste), `update` du seul `name`, `delete`. Nom en double (à la casse près) : `23505` ; formule utilisée par un brouillon, un contenu en ligne ou un lecteur : `P0001` `formule_utilisee` (§ 1.3). Un éditeur : `insert` refusé (`42501`), `update` et `delete` sans effet (0 ligne).
- **Lecture directe** : `versions`, `access_levels` (équipe en aal2), `contents.access_chosen`. « Modifié depuis la publication » : `contents.draft_rev` différent du `draft_rev` de la version `live_version_id`. Historique : `versions` du contenu, `order by number desc` (`number`, `origin`, `published_at`, `published_by_name`, `access_level_name`).
- **État de la programmation** (colonnes de `contents`) : `scheduled_at` renseigné et à venir : programmé ; renseigné et passé : en attente, quelqu'un écrit ([D31]) ; `scheduled_at` vide et `schedule_error` renseigné : échec, avec le code (`auteur_parti`, `brouillon_en_cours_d_ecriture`, `erreur_inattendue`, ou un code de `publish`), et `scheduled_by` (qui avait programmé). `unschedule` ou une nouvelle programmation l'efface.
- **Après** `publish` (si `needs_file_sync`) et `unpublish` (si `needs_file_sync`) : `kickFiles()`, puis relire.

**Contrat pour l'app** : voir § 5.1 (`app_content`, `app_page`, `app_access_levels`).

**Contrat de la base pour l'admin (étape 5, partie n° 2)**

| RPC | Renvoie | Erreurs |
|---|---|---|
| `trash(content_id)` | une ligne `{ needs_file_sync }` (`.single()`). Toutes les sortes (modèles compris). Retire de l'app (`live_version_id` vidé), annule la programmation et son échec, libère le verrou. Rejouable. Si `needs_file_sync`, appeler `kickFiles()` ; « Annuler » appelle `restore` | `contenu_introuvable`, `verrou_tenu` (un **autre** membre l'écrit depuis moins de 90 s : `hint` donne son nom ou son e-mail), `modele_utilise` (bloc partagé cité par un brouillon, corbeille comprise : `hint` liste les titres) |
| `restore(content_id)` | une ligne `{ restored, warnings, title }` : le contenu revient **en brouillon, sans republier** ([D18]) ; `warnings` ⊂ `adresse_retiree` (une autre page a pris l'adresse : la page revient sans adresse), `titre_renomme` (`title` donne le nouveau titre). Rejouable : hors corbeille → `restored = 0` | `contenu_introuvable`, `titre_pris`, `adresse_prise` (pris entre-temps, index unique) |
| `empty_trash(items?)`, `media_outdated`, `media_push` | voir le contrat de l'étape 3 | |

- **Après** `trash` (si `needs_file_sync`), `empty_trash` : `kickFiles()`. Après `media_push` aussi (sans effet utile : aucun fichier ne change d'emplacement).

**Contrat pour l'app (partie n° 2)** : `app_file_locations` et la politique de Storage sur `files-protected` (§ 4.5, § 5.1).

### Étape 6 : Modèles de blocs

Plan, réalisation et écarts : [journal archivé](archives/journal-construction.md), « Étape 6 ».

**Contrat de la base pour l'admin (étape 6)**

| RPC | Renvoie | Erreurs |
|---|---|---|
| `content_create(…, from_template_id?, template_for?)` | voir l'étape 4. `template_for` (`article`, `episode` ou `page`) : obligatoire pour un modèle `starter`, interdit sinon | |
| `template_create_from(content_id, block_ids uuid[], name, sort, template_for?)` | la ligne `contents` du modèle créé (un objet). Blocs de **premier niveau** du brouillon **enregistré**, dans l'ordre du brouillon, avec de nouveaux `id` (encadrés compris) ; un bloc lié devient une copie ordinaire du bloc de son modèle. Aucun verrou pris ; le brouillon d'origine ne change pas | `sorte_invalide`, `demande_invalide` (nom vide ou de plus de 200 caractères, aucun bloc, bloc en double), `titre_pris` (nom déjà pris par un autre modèle), `contenu_introuvable`, `dans_la_corbeille`, `bloc_introuvable` (pas au premier niveau du brouillon enregistré), `modele_un_seul_bloc` (`shared` de plusieurs blocs), `modele_indisponible` (bloc lié vers un modèle indisponible) |
| `template_outdated(template_id)` | lignes `{ content_id, kind, title, version_id, version_number, published_at }` : les contenus **en ligne** dont une copie de ce modèle, **encore liée dans le brouillon** (même `id`), diffère du bloc actuel du modèle (sans les `id` ni les textes alternatifs figés). Vide pour un modèle inconnu, d'une autre sorte, vide ou dans la corbeille | |
| `template_push(template_id)` | lignes `{ content_id, version_id, version_number }` : pour chacun, une version **égale à la version en ligne** dont seules ces copies sont remplacées (`origin = 'template'`, auteur = le membre, `draft_rev` de la version en ligne), mise en ligne. Rejouable (0 ligne). Appeler ensuite `kickFiles()` | `modele_introuvable` (inconnu ou pas `shared`), et, pour tout le geste : `image_sans_fichier`, `fichier_indisponible`, `fichier_inadapte`, `forme_invalide`, `brouillon_trop_imbrique` |
| `template_detach_all(template_id)` | lignes `{ content_id, draft_rev }` : chaque brouillon (corbeille comprise) dont les blocs liés à ce modèle sont devenus des copies ordinaires, avec sa nouvelle révision (recopiée dans `edit_locks`). Rejouable (0 ligne) | `modele_introuvable`, `verrou_tenu` (un **autre** membre écrit l'un de ces brouillons depuis moins de 90 s : `hint` nomme la personne) |

- **Erreurs du brouillon** (`save_draft`, `content_create`, `revert_to_version`) : `modele_vide` (un bloc lié ajouté cite un bloc partagé sans bloc), `modele_un_seul_bloc` (un bloc partagé de plusieurs blocs), `modele_utilise` (vider un bloc partagé encore cité ; `hint` liste les brouillons).
- **Lecture directe** : `contents.template_for` ; les brouillons qui citent un modèle par `draft_template_ids` (`overlaps` / `cs` de PostgREST), corbeille comprise ; `template_copies` (§ 1.12).
- **Écriture directe** : `template_copies` (`insert` de `template_id` et `content_id`, doublon ignoré).
- **Détacher dans un contenu** : côté admin (le bloc lié devient une copie ordinaire, même `id`, nouveaux `id` à l'intérieur), enregistré par `save_draft`.

### Étape 7 : Sections

Plan, réalisation et écarts (partie 7a : Pages, Blog, Podcasts, Accueil ; partie 7b : les méthodes, retirées le 06/10/2026) : [journal archivé](archives/journal-construction.md), « Étape 7 ».

**Contrat de la base pour l'admin (étape 7, partie 7a, et ajouts suivants)**

| RPC | Renvoie | Erreurs |
|---|---|---|
| `categories_reorder(section, ids uuid[])` | les catégories de la section dans le nouvel ordre (lignes de `categories`, positions 0, 1, 2…) ; `ids` = **toutes** les catégories de la section, chacune une fois | `demande_invalide` (section autre que `blog` ou `podcasts`, liste absente, incomplète, en double, ou avec une catégorie d'une autre section) |
| `contents_reorder(kind, ids uuid[])` (30/09/2026, [D47]) | lignes `{ id, list_position }` : les articles ou les épisodes hors corbeille dans le nouvel ordre ; `ids` = **tous**, chacun une fois | `demande_invalide` (autre sorte qu'`article` ou `episode`, liste incomplète ou en double) |

- **Catégories d'un contenu** : réglage `category_ids` de `save_draft` (contrat de l'étape 4) ; [D44] : aucune n'est exigée.
- **Durée d'un épisode** dans l'admin : `media.duration_s` (secondes, `numeric`, lue par le navigateur à l'envoi) du fichier de `draft.audio.mediaId`. Transcription : `media.transcript` du même fichier (avertissement [D46] quand elle est vide).
- **Contrat pour l'app** : `app_feed` et `app_categories` (§ 5.1).

## 7. Limites de l'offre gratuite et risques

> **En bref** : l'offre gratuite suffit pour construire et essayer l'admin, pas pour lancer l'app avec des podcasts : c'est déjà prévu (passage à Pro avant le lancement). Les autres risques sont connus et ont une parade.

| Limite ou risque | Conséquence | Parade |
|---|---|---|
| **Base de 500 Mo** | Chaque version est une copie. Estimation : 300 contenus × 15 versions × 15 Ko ≈ 70 Mo avant compression (Postgres compresse les gros JSON). | 256 Ko par brouillon ; purge des journaux cron et pg_net. L'historique est gardé en entier **[D23]**. **À faire** : afficher la taille de la base dans les Paramètres (alerte à 400 Mo), et, si elle sonne, ne garder que les 20 dernières versions par contenu, jamais la version en ligne. |
| **1 Go de fichiers, 50 Mo par fichier, 5 Go téléchargés par mois** | Suffisant pour des photos réduites, pas pour des podcasts. | Offre Pro avant le lancement (ADMIN § 8). D'ici là, épisodes de test courts. Occupation affichée dans la Médiathèque. |
| **Pas de vidage du cache CDN** | Ancienne adresse publique joignable 1 min au plus (+ 1 min de déplacement au pire), écrit dans ADMIN § 6. | **Question 5 du § 8.2** : réponse B (`cacheControl: '60'`), décidée le 27/09/2026 ; Smart CDN avec Pro (environ 60 s). |
| **Pas de sauvegarde** (offre gratuite) | Une base abîmée ou vidée par erreur ne se récupère pas. | Workflow GitHub hebdomadaire `sauvegarde.yml` (données et structure, 90 jours, décidé le 28/09/2026) ; Pro : sauvegardes quotidiennes. |
| **Pause après une semaine sans activité** | Les publications programmées ne partent pas pendant la pause. | Workflow GitHub quotidien qui appelle `ping()` (§ 3.9) ; rattrapage automatique au redémarrage ; Pro avant le lancement. |
| **Fonctions Edge : 500 000 appels, sans dépassement possible ; 256 Mo de mémoire, 2 s de processeur** | Au-delà, il faudrait payer ; un gros fichier ne pourrait pas être vérifié. | `kick_files` n'appelle que s'il y a du travail ; la lecture des fichiers protégés n'utilise pas de fonction ; SVG et Lottie limités à 5 Mo, trois essais au plus. Quelques milliers d'appels par mois. |
| **Realtime : 200 connexions, 2 M messages par mois** | Sans effet à l'échelle de l'équipe. | On n'écoute que `edit_locks` (lignes minuscules, sans `DELETE`) ; repli sur des appels réguliers. |
| **pg_net est asynchrone, sans garantie de livraison** | Un appel à `files` peut se perdre. | `files` est idempotente et relancée chaque minute tant qu'il reste du travail. La requête ne part que si la transaction est validée (vérifié en local à l'étape 3). |
| **Adresse et clé de `files` publiques** | N'importe qui peut appeler `files` sans session. | Sans membre, elle ne fait que le travail décidé par la base (idempotent), avec un frein en base (20 s entre deux passages, `files_claim_run` : seul le mode `kick` est permis sans membre) ; effacer des orphelins exige un membre aal2. Chaque appel compte quand même dans les 500 000 appels du mois (limite de toute fonction à `verify_jwt = false`, `equipe` comprise). |
| **pg_jsonschema 0.3.3** | Draft-07 et `$ref` récursifs confirmés à l'étape 4 ; `oneOf` exponentiel, `format` ignoré, environ 29 niveaux de listes au plus ; le schéma est relu à chaque contrôle (environ 10 ms pour 256 Ko). | Unions en `if`/`then`/`else`, `pattern` au lieu de `format`, refus lisible au-delà (`brouillon_trop_imbrique`). Les brouillons font quelques dizaines de Ko. |
| **Schéma qui change** | Les lignes existantes ne sont pas revérifiées. | On ne fait qu'ajouter ; un changement cassant passe par une migration des données et `v: 2`. |
| **Vérification des SVG par liste blanche** | Moins permissive qu'un vrai nettoyage. | Elle refuse, elle ne réécrit pas : au pire, un SVG légitime mais exotique (par exemple un export Inkscape brut) est refusé ; nettoyé par l'admin, il passe. L'admin et l'app n'exécutent jamais de script SVG (`<img>`, `react-native-svg`). |
| **Ajv « standalone » sous Hermes** | À vérifier dans l'app (pas encore construite). | Fichier autonome (aides d'Ajv incluses) ; repli : `@cfworker/json-schema` (JavaScript pur). |
| **lottie-react-native** | Version à confirmer avec `npx expo-doctor`. | Installation avec `npx expo install`. |
| **Pas de préproduction** (2 projets gratuits déjà pris) | Tout se teste en local. | pgTAP, tests Deno, Vitest et Playwright contre Supabase local, **lancés sur GitHub à chaque demande de fusion** (§ 6.0). |
| **Fuseau de pg_cron en GMT** | Une heure du fuseau de l'admin mal convertie décalerait la publication. | Tout en `timestamptz` ; `zoneToInstant` testé aux changements d'heure. |
| **Onglet caché** | Chrome ralentit les minuteries : le signe de vie peut tomber à une fois par minute. | Expiration à 90 s, signe de vie au retour sur l'onglet, relâche après 30 minutes cachées. |
| **Reprise de la main** | Celui qui la perd peut perdre au plus 1,5 s de frappe côté serveur. | Son texte reste dans son navigateur (« Copier mon texte »). |
| **Comptes hors équipe** | Un compte lecteur ne doit jamais devenir membre de l'équipe. | Fait à l'étape 2 : fiche d'équipe sur invitation seulement, avec son test. |
| **Équipe** | Tant qu'il n'y a qu'un admin, personne ne peut réinitialiser sa double vérification (ADMIN § 2), et les tests de parcours ont besoin de deux comptes. | Le premier admin est créé à la main (procédure dans ADMIN § 2, `installation/README.md`). **Inviter un second admin** avant d'utiliser l'admin en ligne. En local, les comptes de test et leur secret de double vérification sont créés par les tests (`web/e2e/support/accounts.ts` pour Playwright, `supabase/tests/aides/roles.inc` pour pgTAP) ; le seed ne contient que les réglages locaux de la tâche « fichiers ». |

---

## 8. Décisions prises en autonomie (à relire par l'utilisateur)

> **En bref** : les choix faits sans demander, pour qu'on puisse les valider ou les changer. Une décision retirée ou remplacée garde son numéro (le code les cite) ; son texte d'origine est dans [le journal archivé](archives/journal-construction.md).

### 8.1 Décisions

| n° | Décision | Pourquoi |
|---|---|---|
| D1 | Tables et colonnes en anglais, comme `profiles` ; textes de l'interface dans `web/src/texts/en.ts` (référence) et `fr.ts` | Cohérence avec l'étape 2 |
| D2 | Les versions figent la formule, pas son rang : réordonner les formules change tout de suite qui peut lire quoi | Le rang est un réglage, pas du contenu |
| D3 | Une seule table `contents` pour toutes les sortes, modèles compris | Un seul éditeur, verrou, corbeille et enregistrement à écrire |
| D4 | **Retirée** (06/10/2026, avec l'ancien système des méthodes : une méthode n'avait qu'une fiche, sans blocs) | Texte d'origine dans le journal archivé |
| D5 | **Retirée** (28/09/2026, remplacée par [D43], elle-même retirée avec les méthodes : le niveau de l'introduction d'un chapitre) | Texte d'origine dans le journal archivé |
| D6 | Un fichier est « utilisé » s'il est cité par un brouillon (corbeille et modèles compris) ou une version en ligne ; l'historique ne protège pas les fichiers | Sinon un fichier ne pourrait plus jamais être supprimé |
| D7 | La forme des blocs est un JSON Schema draft-07 écrit à la main (pas un schéma Zod converti, bien que Zod 4 sache produire du draft-07) | Maîtrise exacte du schéma (récursion, `additionalProperties`, trois variantes), aucune dépendance au convertisseur, draft-07 le plus sûr pour pg_jsonschema |
| D8 | Le générateur vit dans `web/` (`npm run blocks:generate`), la source dans `blocks/` à la racine ; les validateurs de l'app sont des fichiers autonomes | `web/` a déjà l'outillage ; la racine ne garde que le CLI Supabase ; `mobile/` n'a pas besoin d'`ajv` |
| D9 | Toute référence de fichier s'appelle `mediaId` (couverture et son compris), toute référence de modèle `templateId` | Les blocs futurs sont suivis sans rien changer |
| D10 | Titres de niveau 2 et 3 seulement ; liens `https:` et `mailto:` seulement, sans `target` ni `rel` | Le titre du contenu est le niveau 1 ; sécurité des liens |
| D11 | Un modèle « bloc partagé » contient exactement un bloc (on regroupe dans un Encadré). **Validé le 27/09/2026** | Lecture littérale de « le même bloc » (ADMIN § 5) |
| D12 | `blocks.tokens.json` partagé entre l'aperçu de l'admin et l'app (l'app reste à faire) | Un aperçu vraiment fidèle |
| D13 | Verrou tenu en base (signe de vie 20 s et au retour sur l'onglet, expiration 90 s, relâché après 30 minutes d'onglet caché) ; libérer = vider `holder_id` ; suivi en direct par Realtime sur `edit_locks` seulement, avec repli toutes les 30 s ; pas de Presence | Réaction immédiate sans messages lourds ; résiste au ralentissement des onglets cachés ; Realtime ne filtre pas les suppressions |
| D14 | Publier est refusé si un **autre** membre écrit le contenu ; si le verrou est libre ou à soi, on publie sans le prendre | Évite de publier un texte en cours d'écriture, sans obliger à « reprendre la main » quand personne n'écrit |
| D15 | Le texte alternatif n'est pas obligatoire pour publier ; l'éditeur ne le réclame plus (02/10/2026, il avertissait avant) | Pas de règle non décidée ; les avertissements étaient jugés trop présents |
| D16 | Une publication programmée publie le brouillon enregistré à l'heure dite, pas une copie faite au moment de programmer (voir D31). **Validé le 27/09/2026** | Les corrections faites entre-temps partent ; pas de copie en double |
| D17 | **Retirée** (06/10/2026, avec les méthodes : « Revenir à cette version » d'une méthode ne ramenait que sa fiche ; les méthodes refaites reviendront en entier (ADMIN § 1)) | Texte d'origine dans le journal archivé |
| D18 | Restaurer depuis la corbeille ramène le contenu en brouillon, sans le republier. **Validé le 27/09/2026** | « Publier reste un geste volontaire » (ADMIN § 4) |
| D19 | Un workflow GitHub quotidien (« Garder le projet actif ») appelle `public.ping()` sur la base de production avec la clé publishable, pour éviter la mise en pause du projet gratuit (ajusté le 27/09/2026 : plus de tâche Vercel ni de `CRON_SECRET`) | pg_cron ne compte peut-être pas comme activité ; aucun secret à régler, rien dans `web/` |
| D20 | Les buckets sont créés par migration, pas déclarés dans `config.toml` | Une seule source, identique en local et en ligne |
| D21 | Fichiers envoyés avec un cache d'une minute (`cacheControl: '60'`, réponse B de la question 5, décidée le 27/09/2026) ; un fichier ne se remplace jamais | Deux minutes au pire sans Pro, écrit dans ADMIN § 6 ; l'app garde ses images en cache par `id`, un cache court ne la ralentit pas |
| D22 | Liens temporaires : 1 h pour les images et PDF, 6 h pour un audio | Un épisode s'écoute sans coupure |
| D23 | Historique gardé en entier ; l'alerte à 400 Mo et la règle de purge restent à faire (§ 7) | Rien ne presse à cette taille |
| D24 | Tout fichier est d'abord protégé ; il ne devient public que quand un contenu gratuit en ligne l'utilise, ou quand il est l'image mise en avant d'un contenu en ligne (question 1, décidée le 27/09/2026)  | Lecture directe d'ADMIN § 6, avec son exception pour l'image mise en avant |
| D25 | Les SVG sont nettoyés dans le navigateur **et** vérifiés par la fonction Edge (refus, sans réécriture) ; les Lottie sont vérifiés de la même façon, sans refuser les « expressions » | La base fait la loi sans nettoyage lourd côté serveur |
| D26 | **Retirée** (06/10/2026, avec les méthodes : retirer de l'app une leçon ou un chapitre seul) | Texte d'origine dans le journal archivé |
| D27 | **Remplacée** par [D47] (30/09/2026) : l'app suivait la date de **première** publication ; elle suit maintenant `list_position` | Une correction ne remonte toujours pas un vieil article |
| D47 | Un seul ordre par section (Blog, Podcasts), brouillons compris : `list_position`, un contenu neuf en tête, rangé par glisser-déposer (`contents_reorder`, liste complète hors corbeille) ; `app_feed` le suit (curseur « place~id »). **Validé le 30/09/2026** | L'équipe décide de ce qui vient en premier ; une correction ne déplace toujours rien |
| D48 | Remplacer un fichier = un **nouveau** fichier du même type ([D21] reste vrai) : `media_replace` le met dans les brouillons (sauf ceux qu'on écrit en ce moment), `media_replace_live` dans ce qui est en ligne, sur décision de l'équipe. **Validé le 30/09/2026** | L'app garde son cache par identifiant ; rien ne change dans l'app sans geste volontaire |
| D49 | **Titre obligatoire** pour publier ou programmer un article, un épisode ou une page (`titre_manquant`, vérifié avant l'image mise en avant ; des espaces ne font pas un titre). Un contenu déjà en ligne sans titre y reste. **Validé le 02/10/2026** | Un titre vide ne s'affiche nulle part dans l'app |
| D28 | Supprimer une catégorie est définitif (pas de corbeille) ; l'app ignore les catégories disparues | La corbeille d'ADMIN § 3 ne liste pas les catégories |
| D29 | **Retirée** (06/10/2026, avec les méthodes : une méthode se publiait d'un seul geste ; la règle est reprise pour les méthodes refaites (ADMIN § 1)) | Texte d'origine dans le journal archivé |
| **D30** | **Texte alternatif et transcription figés à la publication** : les corriger dans la Médiathèque ne change l'app qu'après republication. **Option B retenue le 27/09/2026** : « Mettre à jour ces N contenus dans l'app » sur la fiche du fichier (§ 2.4), RPC `media_push` à l'étape 5 | Tient la copie figée d'ADMIN § 3 ; le raccourci évite de republier chaque contenu |
| **D31** | **Publication programmée pendant qu'on écrit** : si un membre tient un verrou actif et que le brouillon a changé depuis la programmation, elle attend de minute en minute, au plus une heure, puis échoue (« brouillon en cours d'écriture ») ; bandeau permanent dans l'éditeur. Lié à D16. **Validé le 27/09/2026** | Même prudence que D14, alors que personne n'est devant l'écran |
| **D32** | **Remplacée** (09/10/2026, `…_formule_supprimable.sql`) : une formule se supprime dès qu'aucun brouillon, aucun contenu en ligne et aucun lecteur ne s'en sert ; les anciennes versions gardent son nom (`versions.access_level_name`) et perdent le lien (§ 1.3). Avant : seulement une formule inutilisée, versions comprises | Réparer une formule créée par erreur ou abandonnée ; ce qui est en ligne reste protégé |
| **D33** | Types de fichiers en liste fermée (JPEG, PNG, WebP, SVG, JSON Lottie, MP3, M4A/MP4 audio, PDF). Les autres images que le navigateur sait lire (GIF, HEIC) sont converties en WebP ou JPEG à la réduction ; un GIF animé perd son animation, avec un avertissement. Les types audio sont normalisés avant l'envoi (`audio/x-m4a` → `audio/mp4`) | ADMIN § 6 dit « images, audios » : on accepte ce que le navigateur sait lire, sans laisser entrer de format que l'app ne sait pas afficher |
| **D34** | Légende d'image : texte simple, 300 caractères au plus. **Retirée de l'admin le 02/10/2026** : le champ reste, toujours `null`, et l'app ne l'affiche pas | Une légende courte, sans mise en forme, s'affiche partout pareil ; puis jugée inutile (on peut la remettre sans rien perdre) |
| **D35** | Brouillon limité à 256 Ko | Ménager les 500 Mo de base ; un long article en fait quelques dizaines |
| D36 | **Retirée** (06/10/2026, avec les méthodes : mettre seul à la corbeille un chapitre ou une leçon) | Texte d'origine dans le journal archivé |
| **D37** | `reader_access` (formule de chaque lecteur, liée à `auth.users`, avec date de fin et origine) est **provisoire** : elle sert à écrire et tester les règles des contenus réservés. À revoir quand le paiement sera choisi (ADMIN § 10) | Tester dès l'étape 5 qui peut lire quoi, sans préjuger du paiement |
| **D38** | La page Corbeille arrive à l'étape 3 (fichiers seulement), et non à l'étape 5 comme dans ADMIN § 11 | Une médiathèque doit pouvoir supprimer et restaurer |
| **D39** | SVG et Lottie limités à 5 Mo ; trois vérifications ratées → fichier refusé | La fonction Edge doit pouvoir les vérifier (256 Mo, 2 s de processeur) |
| **D40** | Admin de l'étape 3 : envoi standard par `XMLHttpRequest` (même requête que storage-js, avec progression et annulation) ; `<style>` d'un SVG gardé quand il n'a ni adresse extérieure ni échappement (le serveur l'accepte) ; aperçu Lottie par `lottie-web` « light » chargé à la demande ; aperçu PDF par une icône et un lien (pas de pdf.js) ; deux envois à la fois, et un envoi annulé ou abandonné est effacé aussitôt (corbeille puis effacement, invisible dans la Corbeille) | Progression et annulation demandées ; couleurs des exports Illustrator gardées ; pas d'évaluation de code ni de gros lecteur PDF dans l'admin |
| **D41** | **Pas de niveau d'accès par défaut** (décidé le 27/09/2026) : un article, un épisode ou une page neufs ont `access_chosen = false` ; `publish` et `schedule` le refusent (`acces_a_choisir`) tant qu'on n'a pas choisi « Gratuit » ou une formule par `save_draft` (réglage `access_level_id`, `null` compris) | Aucun contenu ne part gratuitement par oubli |
| **D42** | **Remplacée** (08/10/2026) : un point de départ appartient à une sorte, `article`, `episode` ou `page` (`contents.template_for`, avant aussi `chapter`, `lesson` et `exercise`), obligatoire pour un modèle `starter` et vide sinon, choisie à la création (`content_create(…, template_for)`) et fixe ensuite ; `content_create(from_template_id)` refuse un point de départ d'une autre sorte (`modele_indisponible`) | La liste des points de départ reste courte et pertinente |
| D43 | **Retirée** (06/10/2026, avec les méthodes : l'introduction d'un chapitre gratuite dès qu'une de ses leçons l'est ; gardée pour les méthodes refaites (ADMIN § 1)) | Texte d'origine dans le journal archivé |
| **D44** | Catégories **facultatives** (décidé le 28/09/2026) : un article ou un épisode peut n'en avoir aucune | Il apparaît dans la liste complète de l'app, dans aucun filtre |
| **D45** | **Image mise en avant obligatoire** pour publier un article ou un épisode (`image_de_presentation_manquante`)  ; pas d'exigence pour une page (décidé le 28/09/2026) | La vignette des listes de l'app est publique (question 1) : elle doit exister |
| **D46** | **Transcription conseillée** pour un épisode (décidé le 28/09/2026) : facultative, l'éditeur avertit quand le fichier audio n'en a pas, comme D15 ; « Mettre à jour ces N contenus dans l'app » (D30) la propage après coup | Accessibilité sans bloquer la publication |

### 8.2 Questions pour toi

Les cinq questions du 27/09/2026 et leurs réponses sont dans [le journal archivé](archives/journal-construction.md). **Une seule reste ouverte** : les comptes des lecteurs de l'app, dans le même projet Supabase (inscriptions à ouvrir, sécurité de l'admin tenue par la fiche d'équipe sur invitation, § 3.1) ou ailleurs, à décider avec le paiement (§ 5.4).

### 8.3 Ce qui a été corrigé par rapport aux propositions

Dans [le journal archivé](archives/journal-construction.md).
