# Administration (`web/`)

Avant de travailler ici : les décisions sont dans [docs/ADMINISTRATION.md](../docs/ADMINISTRATION.md) (cité « ADMIN § n »), les règles dans [docs/BONNES-PRATIQUES.md](../docs/BONNES-PRATIQUES.md) (§ 2 et § 3), les mots dans [docs/LEXIQUE.md](../docs/LEXIQUE.md), le contrat avec la base dans [docs/ARCHITECTURE-CONTENUS.md](../docs/ARCHITECTURE-CONTENUS.md). Commandes et versions : le [CLAUDE.md](../CLAUDE.md) de la racine.

Ce fichier dit où ranger le code, les pièges à connaître et les briques à réutiliser. Le détail d'un écran se lit dans son code. Les chemins partent de `web/src/`, sauf `e2e/` et les fichiers à la racine de `web/`.

## Où ranger le code

| Quoi                                                       | Où                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Une page                                                   | `pages/`, déclarée par `page(…)` dans `routes.tsx`, avec sa préparation                                      |
| Une section du menu (adresse en anglais, icône, rangement) | `navigation.ts`                                                                                              |
| Une règle sans React (testée seule)                        | `lib/` ; jamais d'appel à Supabase hors de `lib/`                                                            |
| Un appel à la base pour un métier                          | `lib/<métier>.ts` ou `lib/contents/` ; ses erreurs, une `CodedError` avec un code de `texts.x.errors`        |
| Une lecture faite en arrivant sur une page                 | `lib/reads.ts` (`xxxRead(…)`) et `lib/page-preparations.ts`                                                  |
| Un composant de shadcn/ui                                  | `components/ui/` (`npx shadcn add`), seuls les morceaux qui servent                                          |
| Un texte                                                   | `texts/en.ts` d'abord, puis `texts/fr.ts`                                                                    |
| Une couleur, une mesure                                    | un jeton ou un utilitaire nommé d'`index.css`                                                                |
| Une fiche d'aide                                           | `help/fiches/`, ajoutée à `helpFiches` de `help/fiches/index.ts` ; elle se met à jour avec ce qu'elle décrit |
| Un nouveau service appelé par le navigateur                | `web/csp.ts` (règles de sécurité, CSP)                                                                       |
| Un nouveau bloc                                            | voir « Éditeur des contenus »                                                                                |

## Textes, langue, dates

- **Aucun texte en dur.** Les composants lisent `texts` de `texts.ts` (la langue de l'admin). `texts/en.ts` est la référence (sa forme donne le type `Texts`), `texts/fr.ts` en est tiré. Les mots communs sont dans `texts.common`. L'interface tutoie la personne.
- En français, une espace insécable (U+00A0) précède « : ; ! ? » et borde l'intérieur des guillemets : `texts.test.ts` le vérifie.
- Les noms du Blog et des Podcasts sont réglables par un admin : ne les écris jamais en dur, lis-les par `sectionNamesFor` (`lib/section-names.ts`, noms d'origine dans `texts/section-names.ts`). Les adresses (`/blog`, `/podcasts`) et les mots « article » et « épisode » ne changent pas.
- La langue (`lib/language.ts`), le format régional (`lib/regional-format.ts`) et le fuseau (`lib/time-zone.ts`) : celui du membre passe avant celui de toute l'admin (`memberAdminChoice` de `lib/stored-choice.ts`). Ils sont gardés sur le navigateur et suivis par `useAdminSettings` dans `RootLayout`, et la page se recharge s'ils changent.
- Toute date s'affiche par `formatDateTime` (`lib/dates.ts`) et se tape par `parseDayInput` et `parseTimeInput` ; pour programmer, `zoneToInstant` et `toZoneParts`. Tailles, durées et pourcentages : `lib/media/format.ts`.
- **Les tests lisent l'admin en français.** Dans Vitest, `@/texts` mène à `src/test/texts.ts`, les mêmes textes avec des espaces ordinaires (Testing Library ne remplace pas celles du texte cherché). Dans Playwright : `fr as texts` dans `e2e/`.

## La marque

- Jamais « Ruche » ni le nom de la marque en dur dans un composant : `useBrandName`, `useBrand` (`hooks/use-brand-name.ts`), affichés par `BrandLogo` (`components/brand-logo.tsx`). L'identité de l'admin (nom, initiales, logos, image de connexion, monogramme animé) : `lib/admin-identity.ts` ; un réglage s'enregistre par `useBrandMutation`, puis se relit.
- **L'identité de l'app** (App mobile › Identité, table `app_identity`) se règle avec les mêmes cartes que celle de l'admin : chacune reçoit sa cible, `target` (`IdentityTarget` : `"admin"` ou `"app"`), et les fonctions de `lib/admin-identity.ts` aussi (`saveBrandDetails(target, …)`, `saveBrandFile`, `saveScreenImage`…) ; ses mots propres : `identityWords(target)` ; sa lecture : `identityRead(target)` (`lib/reads.ts`), `useIdentity(target)`. Les sections : `components/settings/identity-sections.tsx`. L'app n'a pas de déclinaisons par palette. `useBrand`, `BrandLogo` (sans `target`) et le favicon restent ceux de l'admin.
- Aucun logo de Ruche par défaut : sans logo, le nom en texte ; sans monogramme, les initiales (`brandMark`).
- Les couleurs d'un logo SVG : `lib/brand-colors.ts` ; ses déclinaisons par palette : `presetLogoColors` de `lib/palettes.ts`.

## Briques communes

À réutiliser avant d'en écrire une autre (BONNES-PRATIQUES § 2).

- **Listes**
  - `ListCard` et `ListEmpty` (`components/list-card.tsx`) : une liste dans sa carte blanche, son état vide ou sans résultat.
  - `components/load-state.tsx` : une liste pas encore chargée, son échec ; `RefreshFailed`, une relecture échouée.
  - La pagination : `components/list-pagination.tsx`, `hooks/use-pagination.ts`, `lib/pagination.ts` (« Mettre en tête » et « Mettre à la fin » : `movedTo`, `withPageOrder`). Une liste lue en entier : `readAll` (`lib/read-all.ts`).
  - `SortableList` (`components/list-sorting.tsx`) : une liste rangée par glisser-déposer, souris et clavier ; chaque élément passe par `useSortableItem`, avec la poignée `DragHandle`.
  - `components/ordered-names.tsx` : une liste de noms rangée, renommée, complétée (Formules).
  - `RowActionsMenu` (`components/row-actions-menu.tsx`) : le menu « … » d'une ligne. `components/contents/row-cells.tsx` : la date et l'image mise en avant d'une ligne.
  - `components/uses-dialog.tsx` : la fenêtre « Utilisé dans » et son export CSV (`lib/uses-export.ts`), pour les fichiers, les catégories et les modèles.
- **Sélection en masse et corbeille**
  - `lib/bulk-trash.ts` et `components/bulk-selection.tsx` : cocher, « Tout sélectionner », « Mettre à la corbeille (n) », lignes gardées.
  - `useTrashMany` (`hooks/use-trash-many.ts`) : la mise à la corbeille en masse avec « Annuler » ; pour des contenus, `components/contents/use-contents-selection.ts` (`keptContentDetail`).
  - `ConfirmDialog` et `TrashDialog` (`components/confirm-dialog.tsx`) : toute confirmation avant d'agir.
  - `components/contents/announce-restore.ts` : ce qu'on dit après une restauration ; `lib/refresh.ts` : relecture après une corbeille.
- **Champs et petits composants**
  - `SearchInput` (`components/search-input.tsx`), `DayField` et `TimeField` (`components/date-time-fields.tsx`), `AudioPlayer` (`components/media/audio-player.tsx`), `HiddenFileInput` et `RemoveFileButton` (`components/file-input.tsx`).
  - `PageHeader` (`components/page-header.tsx`, l'icône de la section devant le titre), `PanelCard` (`components/panel-card.tsx`), `SaveFooter` (`components/settings/save-footer.tsx`), `SettingsSection` (`components/settings/settings-section.tsx`).
  - `TruncatedText` (`components/truncated-text.tsx`), `InfoTip` (`components/info-tip.tsx`), `IconBadge` (`components/icon-badge.tsx`).
  - `ColumnHeader` (`components/editor/column-header.tsx`) : l'en-tête d'une colonne ou d'une glissière de l'éditeur.
  - `PhoneFrame` (`components/phone-frame.tsx`) : le téléphone des aperçus (cadre, barre d'état, thème de l'écran), dans l'éditeur des contenus et l'aperçu de l'écran de chargement. `ThemeToggleGroup` (`components/theme-choice.tsx`) : des thèmes en icônes.
  - `blocks/components/media-state.tsx` : une image à ses proportions, un fichier qui ne s'affiche pas.
- **Logique sans React**
  - `lib/auth.ts` : tous les appels de Supabase Auth ; `lib/people.ts` : nom affiché, initiale.
  - `lib/errors.ts` (`errorMessage`, `CodedError`, `isErrorCode`) et `lib/error-facts.ts` (`describeFacts`) : le message et la précision d'une erreur. Le `detail` de la base, en français, ne s'affiche jamais.
  - `lib/focus.ts` (`focusSoon`, `highlightSoon`), `lib/stored-choice.ts` (`readStored`, `writeStored`), `lib/titles.ts` (`displayTitle`), `lib/sentry.ts` (`reportError`, une erreur qui ne devrait pas arriver).
  - `lib/address.ts` et `useAddressState` (`hooks/use-address-state.ts`) : les réglages d'une liste dans son adresse (ADMIN § 7).
- **Styles** : dans `index.css`, les jetons (`text-warning`, `bg-status-*`…) et les utilitaires nommés (`grid-cols-media`, `grid-cols-label-value`, `grid-cols-list-aside`, `max-h-picker`, `pb-page`, `z-popup`…). Le panneau gris des pages avec le menu : `bg-panel`, `--panel`, `--page-gap`.

## Pièges

- **Une page arrive préparée** (BONNES-PRATIQUES § 2) : ce qu'elle lit en arrivant passe par `lib/reads.ts` et sa préparation dans `lib/page-preparations.ts`. Le loader `pageLoader` attend 2 secondes au plus (`lib/preparation.ts`) ; la console dit « Lecture non préparée » sinon, et `e2e/navigation.spec.ts` échoue. Dans les tests, `await renderApp(…)` attend le code de la page.
- **La place de chaque page** se garde au retour (`lib/scroll-memory.ts`) : une liste pose `data-content-row` sur chaque ligne, et un lien de retour passe `RETURN_STATE`.
- **Synchroniser les fichiers** : après un envoi, une mise à la corbeille, un vidage, « Nettoyer », `empty_trash`, `media_push`, et après `publish`, `unpublish` ou `trash` d'un contenu quand la base répond `needs_file_sync`, l'admin appelle `kickFiles()` puis relit (TanStack Query : `contentKeys`, `mediaKeys`). C'est ce qui rend un fichier public ou protégé tout de suite.
- **Un membre qui perd l'accès** est traité une seule fois pour toute l'admin (`lib/query-client.ts`, `lib/access-lost.ts`) : ne le gère pas page par page.
- **Les réglages d'un contenu** partent avec le brouillon par `save_draft`, sous le verrou, et seuls ceux qui changent sont envoyés (`settingsDiff` de `lib/contents/api.ts`). Hors de l'éditeur, ils passent par `lib/contents/settings.ts`.
- **Un titre par section** : la base refuse un titre pris (`titre_pris`) ; `useTitleCheck` (`hooks/use-title-check.ts`) le dit en tapant.
- **Un bouton n'en contient pas un autre** (dans la grille de la Médiathèque, la pastille est à côté du bouton de la vignette).
- **Les tests SVG** lisent `supabase/functions/files/fixtures/` (autorisé dans `vite.config.ts`, pendant les tests seulement) : un SVG nettoyé par l'admin doit rester accepté par le serveur. `blocks/validators.test.ts` lit les cas partagés de `blocks/cases/` (racine du dépôt).

## Éditeur des contenus

- Les sortes sont `article`, `episode`, `page` et `template` (`ContentKind` de `lib/contents/api.ts`). `contentEditorPath` (`navigation.ts`) mène chacune à son éditeur.
- **Le profil d'une sorte** (`contentProfile` de `lib/editor/profile.ts`) dit qui la publie, l'image mise en avant, l'audio, les catégories, le niveau d'accès, l'adresse, « Mes blocs », la limite d'un bloc partagé. L'éditeur, les listes et `publishChecks` le lisent : une sorte qui change d'exigence ne se change que là.
- `pages/editor-page.tsx` (plein écran, hors `AppLayout`) assemble les hooks de `components/editor/` : `use-draft-sync.ts` et `use-draft-saving.ts` (le verrou et le brouillon), `use-block-editing.ts` (les blocs), `use-publication.ts`, `use-phone-view.ts` (le téléphone dans l'adresse), `use-focus-mode.ts`, `use-revert.ts`.
- La logique sans React : `blocks/` (`draft.ts` : créer, déplacer, préparer un brouillon, 240 000 octets au plus ; `dnd.ts` ; `registry.ts` ; `labels.ts` ; `text/`, la configuration de Tiptap), `lib/editor/` (`autosave.ts` et `edit-lock.ts`, testés avec de fausses minuteries ; `outline.ts` ; `preview.ts` ; `lock-view.ts`).
- **En Lecture, on ne prend pas la main** : `writing` de `useDraftSync` et `useEditLock`, `setWriting` d'`EditLockController` (suivre le verrou sans le prendre).
- Le glisser-déposer des blocs se fait dans le plan (`useBlockDrag`), pas dans le téléphone.
- **Un nouveau bloc** : son schéma dans `blocks/` (racine du dépôt, voir `supabase/CLAUDE.md`), `npm run blocks:generate`, une entrée dans `blocks/registry.ts`, son affichage (`BlockBody` de `blocks/components/block-canvas.tsx`), ses réglages (`components/editor/block-settings.tsx`) et son résumé (`BlockSummary`).
- **Les modèles** : `lib/contents/templates.ts` (base) et `blocks/templates.ts` (copie, détachement, insertion, règle « un seul bloc »). Chaque copie d'une mise en forme ou d'un point de départ se note par `recordTemplateCopy` (`lib/contents/template-copies.ts`).
- **La publication** : `lib/contents/publication.ts` (état, publier, retirer, programmer, historique, corbeille, restauration) ; ce qui manque pour publier : `lib/contents/requirements.ts`.

## Autres métiers

- Médiathèque : `lib/media/` (sans React : reconnaissance, réduction des photos, nettoyage des SVG, vérification des Lottie, file d'envoi, appels à `files`), `pages/media-page.tsx`, `components/media/`. « Remplacer… » : `replaceMedia`, `replaceMediaLive` ([D48]).
- Listes du Blog, des Podcasts et des Pages : `pages/content-list-page.tsx`, filtres de `lib/contents/list-filters.ts`, textes par sorte dans `texts.contentList.kinds`.
- Catégories : `lib/categories.ts`, `hooks/use-categories.ts`, `components/categories/` ; retirer une catégorie d'un contenu : `lib/contents/category-removal.ts`.
- Formules : `lib/access-levels.ts` ; Corbeille : `lib/trash.ts`, `pages/trash-page.tsx`.
- La team : `lib/team.ts` (la fonction serveur `equipe`), `components/team/` ; Mon compte : `pages/account-page.tsx`.
- Le groupe « App mobile » (admins seulement) : `appSections` de `navigation.ts` ; un éditeur ne le voit pas (`adminOnlySections`). L'Identité de l'app : `pages/app-identity-page.tsx` ; les pages encore vides : `pages/app-section-page.tsx`.
- Les couleurs de chacun : `lib/palettes.ts` (valeurs générées dans `lib/generated/palettes-data.ts` par `npm run palettes:generate`), `PaletteProvider`.

## Tests

- Garde-fous écrits en tests : `web/texts-used.test.ts` (chaque texte sert, chaque code d'erreur de la base a son texte) et `web/css-used.test.ts` (aucun CSS inutile ni en double).
- Parcours Playwright : `e2e/navigation.spec.ts` (le tour de l'admin, à compléter pour toute nouvelle page) et `e2e/sections.spec.ts`. Une page se crée par `createBlankPage` (`e2e/support/fixtures.ts`) ; ce que voit l'app : `appFeed`, `appCategories` (`e2e/support/sections.ts`) ; un audio : `silentMp3(secondes)` (`e2e/support/media.ts`).
