import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Ellipsis,
  FilePlus2,
  Plus,
  FileText,
  FilterX,
  Search,
  Settings2,
  SquarePen,
  Eraser,
  TriangleAlert,
  ArrowDownToLine,
  ArrowUpToLine,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"

import { toast } from "sonner"

import {
  BulkTrashButton,
  KeptNotice,
  SelectAllHead,
  type SelectAll,
} from "@/components/bulk-selection"
import { CategoriesTab } from "@/components/categories/categories-tab"
import { useCategoriesBulk } from "@/components/categories/use-categories-bulk"
import { ListCard, ListEmpty } from "@/components/list-card"
import { ListPagination } from "@/components/list-pagination"
import { CoverCell, SavedCell } from "@/components/contents/row-cells"
import { useContentsSelection } from "@/components/contents/use-contents-selection"
import { ListSettingsSheet } from "@/components/contents/list-settings-sheet"
import {
  NewContentDialog,
  type ListKind,
  type NewContent,
} from "@/components/contents/new-content-dialog"
import { SortableRow } from "@/components/contents/sortable-rows"
import { useCovers } from "@/components/contents/use-covers"
import { LiveBadge, ScheduleBadge } from "@/components/editor/publication"
import { SortableList } from "@/components/list-sorting"
import { LoadState } from "@/components/load-state"
import { PageHeader } from "@/components/page-header"
import { SearchInput } from "@/components/search-input"
import { useAccessCheck } from "@/components/team/use-access-check"
import { TrashDialog } from "@/components/trash-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAddressState } from "@/hooks/use-address-state"
import {
  listFiltersFromAddress,
  listTabFromAddress,
  writeListFilters,
  writeListTab,
  type ListTab,
} from "@/lib/address"
import { categoryNames, type Category } from "@/lib/categories"
import {
  ContentError,
  contentKeys,
  isOrderedKind,
  reorderContents,
  type ContentListItem,
} from "@/lib/contents/api"
import {
  ALL_CATEGORIES,
  filterContents,
  isStateFilter,
  itemStatus,
  NO_CATEGORY,
  noFilters,
  stateFilters,
  type ListFilters,
} from "@/lib/contents/list-filters"
import { restoreContent, trashContent } from "@/lib/contents/publication"
import { createWithSettings } from "@/lib/contents/settings"
import { contentProfile } from "@/lib/editor/profile"
import { useCategories } from "@/hooks/use-categories"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { usePagination } from "@/hooks/use-pagination"
import { errorMessage } from "@/lib/errors"
import { kickFiles } from "@/lib/media/api"
import { movedTo, PAGE_SIZE, withPageOrder } from "@/lib/pagination"
import { accessLevelsRead, contentListRead, startersRead } from "@/lib/reads"
import { refreshAfterContentTrash } from "@/lib/refresh"
import { editorPath, sections, type SectionKey } from "@/navigation"
import { displayTitle } from "@/lib/titles"
import { texts } from "@/texts"

const labels = texts.contentList

/**
 * Liste des contenus d'une section (Pages, Blog, Podcasts) : recherche, filtres par état de
 * publication et par catégorie, créer (vide ou depuis un point de départ, [D42]), ouvrir dans
 * l'éditeur, mettre à la corbeille. Pour une page, son adresse ; pour un article ou un épisode,
 * ses catégories. Le Blog et les Podcasts ont deux onglets, les contenus et les catégories
 * (CategoriesTab, « ?tab=categories ») ; le bouton en tête de page suit l'onglet.
 */
export function ContentListPage({
  section,
  kind,
}: {
  section: SectionKey
  kind: ListKind
}) {
  const { title, description } = texts.sections[section]
  const kindLabels = labels.kinds[kind]
  const categorySection = contentProfile(kind).categories
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()

  const list = useQuery({
    ...contentListRead(kind),
    // Les publications programmées : relu toutes les 30 secondes.
    refetchInterval: 30_000,
  })
  const categories = useCategories(categorySection)
  // Les formules : réglages d'une ligne.
  const levels = useQuery(accessLevelsRead())
  // Blog, Podcasts : l'image mise en avant de chacun, en vignette (celles
  // de toute la liste : une recherche ou un filtre ne les relit pas).
  const coverFor = useCovers(
    contentProfile(kind).listed ? (list.data ?? []) : []
  )
  const items = list.data
  // Blog, Podcasts : l'onglet ouvert, gardé dans l'adresse.
  const [tab, setTab] = useAddressState(listTabFromAddress, writeListTab)
  const onCategories = categorySection !== null && tab === "categories"
  const [creatingCategory, setCreatingCategory] = useState(false)
  const categoryBulk = useCategoriesBulk()
  const [toTrash, setToTrash] = useState<ContentListItem | null>(null)
  // La recherche et les filtres, gardés dans l'adresse (on retrouve la liste en y revenant).
  const [filters, setFilters] = useAddressState(
    listFiltersFromAddress,
    writeListFilters
  )
  const search = useDebouncedValue(filters.search, 150)

  const known = useMemo(
    () =>
      categories.data
        ? new Set(categories.data.map((category) => category.id))
        : undefined,
    [categories.data]
  )
  // Une catégorie choisie dans le filtre, puis supprimée : le filtre revient à « Toutes ».
  const category =
    filters.category === ALL_CATEGORIES ||
    filters.category === NO_CATEGORY ||
    !known ||
    known.has(filters.category)
      ? filters.category
      : ALL_CATEGORIES
  const shown = useMemo(
    () =>
      items
        ? filterContents(
            items,
            { ...filters, search, category },
            list.dataUpdatedAt,
            known
          )
        : [],
    [items, list.dataUpdatedAt, filters, search, category, known]
  )
  // Une page de la liste (25 lignes) ; une recherche ou un filtre ramène à la première.
  const paged = usePagination(
    shown,
    PAGE_SIZE,
    JSON.stringify({ ...filters, search, category, tab }),
    !onCategories
  )
  // Sélection en masse, sur la page affichée ; un contenu que quelqu'un d'autre écrit est gardé
  // et listé.
  const bulk = useContentsSelection({
    shown: paged.items,
    words: { ...kindLabels, undo: labels.undo },
    nameOf: (item) => displayTitle(item.title),
  })
  const { selection } = bulk
  const filtering =
    filters.search.trim() !== "" ||
    filters.state !== "all" ||
    category !== ALL_CATEGORIES

  const refresh = () => refreshAfterContentTrash(queryClient)

  // « Annuler » dans le message : le contenu revient en brouillon, sans être republié.
  const undo = async (item: ContentListItem) => {
    const name = displayTitle(item.title)
    try {
      const { addressRemoved, renamedTo } = await restoreContent(item.id)
      if (renamedTo !== null)
        toast.warning(texts.trash.restoredRenamed(name, renamedTo))
      if (addressRemoved)
        toast.warning(texts.trash.restoredWithoutAddress(name))
      else if (renamedTo === null) toast.success(kindLabels.restored(name))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      await refresh()
    }
  }

  const trash = useMutation({
    mutationFn: (item: ContentListItem) => trashContent(item.id),
    onSuccess: (result, item) => {
      setToTrash(null)
      bulk.toggle(item, false)
      toast.success(labels.trashed(displayTitle(item.title)), {
        action: { label: labels.undo, onClick: () => void undo(item) },
      })
      // Ses fichiers redeviennent peut-être protégés : tout de suite.
      if (result.needsFileSync) void kickFiles()
    },
    onError: (error) => {
      setToTrash(null)
      toast.error(error.message, {
        description:
          error instanceof ContentError
            ? (error.detail ?? undefined)
            : undefined,
      })
      checkAccess(error)
    },
    onSettled: refresh,
  })

  useEffect(() => {
    if (list.error) checkAccess(list.error)
  }, [list.error, checkAccess])

  // Les points de départ de cette sorte ([D42]) : « Nouvel article » propose « Article vide »
  // ou l'un d'eux. Sans point de départ (ou si la liste ne se lit pas), un contenu vide.
  const starters = useQuery(startersRead(kind))

  // « Nouvel article » (…) : une fenêtre (titre, point de départ, réglages), puis l'éditeur.
  const [creating, setCreating] = useState(false)
  const create = useMutation({
    mutationFn: ({ title, starterId, choices }: NewContent) =>
      createWithSettings(kind, title, starterId, choices),
    onSuccess: ({ content, settingsError }) => {
      queryClient.setQueryData(contentKeys.detail(content.id), content)
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(kind) })
      setCreating(false)
      if (settingsError) {
        toast.error(
          labels.newContent.settingsFailed(errorMessage(settingsError))
        )
      }
      void navigate(editorPath(section, content.id))
    },
    onError: (error) => checkAccess(error),
  })
  // Blog, Podcasts : ranger par glisser-déposer ([D47]). La liste change
  // tout de suite ; si l'enregistrement échoue, elle reprend son ordre.
  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      isOrderedKind(kind) ? reorderContents(kind, ids) : Promise.resolve(),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: contentKeys.list(kind) })
      const previous = queryClient.getQueryData<ContentListItem[]>(
        contentKeys.list(kind)
      )
      queryClient.setQueryData<ContentListItem[]>(
        contentKeys.list(kind),
        (list) => {
          if (!list) return list
          const byId = new Map(list.map((item) => [item.id, item]))
          return ids.flatMap((id, index) => {
            const item = byId.get(id)
            return item ? [{ ...item, list_position: index }] : []
          })
        }
      )
      return { previous }
    },
    onSuccess: () => toast.success(labels.order.saved),
    onError: (error, _ids, context) => {
      queryClient.setQueryData(contentKeys.list(kind), context?.previous)
      toast.error(labels.order.failed, { description: errorMessage(error) })
      checkAccess(error)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: contentKeys.list(kind) }),
  })

  // « Réglages » depuis le menu d'une ligne.
  const [settingsFor, setSettingsFor] = useState<ContentListItem | null>(null)
  const sectionCategories = categorySection
    ? {
        section: categorySection,
        list: categories.data,
        failed: categories.isError,
        retry: () => void categories.refetch(),
      }
    : undefined

  const contents =
    list.data === undefined ? (
      <ListCard>
        <LoadState
          query={list}
          failed={labels.loadFailed}
          rows={3}
          rowClassName="h-12 w-full"
        />
      </ListCard>
    ) : (
      <div className="space-y-4">
        {list.isError && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{labels.refreshFailed}</AlertDescription>
          </Alert>
        )}
        <KeptNotice
          kept={bulk.kept}
          nameOf={(item) => displayTitle(item.title)}
          words={kindLabels}
          onClose={bulk.closeKept}
        />
        {list.data.length === 0 ? (
          <ListEmpty
            icon={FileText}
            title={kindLabels.emptyTitle}
            description={kindLabels.emptyDescription}
          />
        ) : (
          <>
            <ListFiltersBar
              kind={kind}
              filters={{ ...filters, category }}
              categories={categorySection ? categories.data : undefined}
              filtering={filtering}
              count={labels.count(shown.length, list.data.length)}
              onChange={setFilters}
            />
            {shown.length === 0 ? (
              <ListEmpty icon={Search} title={kindLabels.noResults} />
            ) : (
              <>
                {isOrderedKind(kind) && filtering && (
                  <p className="text-sm text-muted-foreground">
                    {labels.order.filtering}
                  </p>
                )}
                <ContentTable
                  kind={kind}
                  section={section}
                  items={paged.items}
                  now={list.dataUpdatedAt}
                  categories={categories.data}
                  selectAll={bulk.selectAll}
                  selected={bulk.checkedIds}
                  onSelect={bulk.toggle}
                  trashing={trash.isPending || bulk.pending}
                  onTrash={setToTrash}
                  onSettings={setSettingsFor}
                  coverFor={coverFor}
                  order={
                    isOrderedKind(kind)
                      ? {
                          disabled:
                            filtering || reorder.isPending || bulk.pending,
                          // Rangée dans la page : toute la liste suit (sans filtre, shown
                          // est la liste entière, dans son ordre).
                          onReorder: (ids) =>
                            reorder.mutate(
                              withPageOrder(
                                shown.map((item) => item.id),
                                ids,
                                paged.from - 1
                              )
                            ),
                          onMove: (item, place) =>
                            reorder.mutate(
                              movedTo(
                                shown.map((one) => one.id),
                                item.id,
                                place
                              )
                            ),
                        }
                      : undefined
                  }
                />
                <ListPagination pagination={paged} />
              </>
            )}
          </>
        )}
      </div>
    )

  return (
    <>
      <PageHeader
        icon={sections[section].icon}
        title={title}
        description={description}
        actions={
          onCategories ? (
            <>
              {categoryBulk.selected.size > 0 && (
                <Button
                  variant="destructive"
                  disabled={categoryBulk.removeMany.isPending}
                  onClick={() => categoryBulk.setConfirming(true)}
                >
                  {categoryBulk.removeMany.isPending ? <Spinner /> : <Eraser />}
                  {texts.categories.removeMany(categoryBulk.selected.size)}
                </Button>
              )}
              <Button onClick={() => setCreatingCategory(true)}>
                <Plus />
                {texts.categories.create}
              </Button>
            </>
          ) : (
            <>
              <BulkTrashButton
                count={selection.items.length}
                pending={bulk.pending}
                onClick={bulk.askConfirm}
              />
              <Button onClick={() => setCreating(true)}>
                <FilePlus2 />
                {kindLabels.create}
              </Button>
            </>
          )
        }
      />

      {categorySection ? (
        <Tabs value={tab} onValueChange={(value: ListTab) => setTab(value)}>
          <TabsList aria-label={labels.tabs(title)}>
            <TabsTrigger value="contents">{kindLabels.tab}</TabsTrigger>
            <TabsTrigger value="categories">{texts.categories.tab}</TabsTrigger>
          </TabsList>
          <TabsContent value="contents" className="pt-4">
            {contents}
          </TabsContent>
          <TabsContent value="categories" className="pt-4">
            <CategoriesTab
              section={categorySection}
              creating={creatingCategory}
              onCreatingChange={setCreatingCategory}
              bulk={categoryBulk}
            />
          </TabsContent>
        </Tabs>
      ) : (
        contents
      )}

      <NewContentDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open)
          if (!open) create.reset()
        }}
        kind={kind}
        starters={starters.data ?? []}
        categories={sectionCategories}
        pending={create.isPending}
        error={
          create.error
            ? `${kindLabels.createFailed} ${errorMessage(create.error)}`
            : null
        }
        onSubmit={(created) => create.mutate(created)}
      />
      {settingsFor && (
        <ListSettingsSheet
          key={settingsFor.id}
          item={settingsFor}
          kind={kind}
          categories={sectionCategories}
          levels={levels.data}
          levelsFailed={levels.isError}
          onClose={() => setSettingsFor(null)}
        />
      )}
      <TrashDialog
        open={toTrash !== null}
        title={kindLabels.confirmTrashTitle}
        description={
          toTrash ? kindLabels.confirmTrash(displayTitle(toTrash.title)) : ""
        }
        confirmLabel={labels.confirmTrash.confirm}
        pending={trash.isPending}
        onCancel={() => setToTrash(null)}
        onConfirm={() => toTrash && trash.mutate(toTrash)}
      />
      <TrashDialog
        open={bulk.confirming && selection.items.length > 0}
        title={
          selection.items.length === 1
            ? kindLabels.confirmTrashTitle
            : kindLabels.confirmTrashManyTitle(selection.items.length)
        }
        description={
          selection.items.length === 1
            ? kindLabels.confirmTrash(displayTitle(selection.items[0].title))
            : kindLabels.confirmTrashMany
        }
        confirmLabel={labels.confirmTrash.confirm}
        pending={bulk.pending}
        onCancel={bulk.cancel}
        onConfirm={bulk.confirm}
      />
    </>
  )
}

/** Recherche, filtre par état et, pour le Blog et les Podcasts, par catégorie. */
function ListFiltersBar({
  kind,
  filters,
  categories,
  filtering,
  count,
  onChange,
}: {
  kind: ListKind
  filters: ListFilters
  // Les catégories de la section (undefined : pas de filtre par catégorie, ou pas encore lues).
  categories: Category[] | undefined
  filtering: boolean
  count: string
  onChange: (next: ListFilters) => void
}) {
  const filterLabels = labels.filters
  const stateItems = stateFilters.map((value) => ({
    value,
    label: filterLabels.states[value],
  }))
  const categoryItems = [
    { value: ALL_CATEGORIES, label: filterLabels.allCategories },
    { value: NO_CATEGORY, label: filterLabels.noCategory },
    ...(categories ?? []).map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ]
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        value={filters.search}
        onChange={(search) => onChange({ ...filters, search })}
        label={labels.kinds[kind].search}
        placeholder={labels.searchPlaceholder}
        className="w-72"
      />
      <Select
        items={stateItems}
        value={filters.state}
        onValueChange={(value) => {
          if (isStateFilter(value)) onChange({ ...filters, state: value })
        }}
      >
        <SelectTrigger aria-label={filterLabels.state} className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {stateItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {categories && (
        <Select
          items={categoryItems}
          value={filters.category}
          onValueChange={(value) => {
            if (typeof value === "string")
              onChange({ ...filters, category: value })
          }}
        >
          <SelectTrigger
            aria-label={filterLabels.category}
            className="min-w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.slice(0, 2).map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
            {categoryItems.length > 2 && <SelectSeparator />}
            {categoryItems.slice(2).map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {filtering && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ ...noFilters })}
        >
          <FilterX />
          {filterLabels.reset}
        </Button>
      )}
      <p
        role="status"
        className="ml-auto text-sm text-muted-foreground tabular-nums"
      >
        {count}
      </p>
    </div>
  )
}

function ContentTable({
  kind,
  section,
  items,
  now,
  categories,
  selectAll,
  selected,
  onSelect,
  trashing,
  onTrash,
  onSettings,
  order,
  coverFor,
}: {
  kind: ListKind
  section: SectionKey
  items: ContentListItem[]
  now: number
  categories: Category[] | undefined
  // Sélection en masse : « Tout sélectionner » et les contenus cochés.
  selectAll: SelectAll
  selected: ReadonlySet<string>
  onSelect: (item: ContentListItem, checked: boolean) => void
  trashing: boolean
  onTrash: (item: ContentListItem) => void
  onSettings: (item: ContentListItem) => void
  // Blog, Podcasts : le glisser-déposer ([D47]) ; disabled pendant une
  // recherche, un filtre ou un enregistrement (on ne range que la liste complète).
  // « Mettre en tête » et « Mettre à la fin » (menu « … »), d'une page à l'autre.
  order?: {
    disabled: boolean
    onReorder: (ids: string[]) => void
    onMove: (item: ContentListItem, place: "top" | "bottom") => void
  }
  // L'image mise en avant de chacun (celles de toute la liste, lues en une fois).
  coverFor: ReturnType<typeof useCovers>
}) {
  const profile = contentProfile(kind)
  const withCategories = profile.categories !== null
  // Blog, Podcasts : l'image mise en avant de chacun, en vignette.
  const withCover = profile.listed
  const table = (
    <ListCard>
      <Table>
        <TableHeader>
          <TableRow>
            {order && (
              <TableHead className="w-0">
                <span className="sr-only">{labels.order.column}</span>
              </TableHead>
            )}
            <SelectAllHead {...selectAll} />
            {withCover && (
              <TableHead className="w-14">
                <span className="sr-only">{labels.columns.cover}</span>
              </TableHead>
            )}
            <TableHead>{labels.columns.title}</TableHead>
            {withCategories && (
              <TableHead>{labels.columns.categories}</TableHead>
            )}
            <TableHead>{labels.columns.publication}</TableHead>
            <TableHead>{labels.columns.savedAt}</TableHead>
            <TableHead className="w-0">
              <span className="sr-only">{texts.common.actions}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = itemStatus(item, now)
            const name = displayTitle(item.title)
            const cells = (
              <>
                <TableCell>
                  <Checkbox
                    aria-label={texts.selection.select(name)}
                    checked={selected.has(item.id)}
                    disabled={trashing}
                    onCheckedChange={(value) => onSelect(item, value)}
                  />
                </TableCell>
                {withCover && <CoverCell {...coverFor(item)} />}
                <TableCell className="max-w-80 font-medium">
                  <Link
                    to={editorPath(section, item.id)}
                    className="line-clamp-2 underline-offset-4 hover:underline"
                  >
                    {name}
                  </Link>
                </TableCell>
                {withCategories && (
                  <TableCell className="max-w-64 text-muted-foreground">
                    <CategoriesCell ids={item.category_ids} all={categories} />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <LiveBadge live={status.live} />
                    <ScheduleBadge schedule={status.schedule} />
                  </div>
                </TableCell>
                <SavedCell savedAt={item.draft_saved_at} />
                <TableCell>
                  <RowActions
                    title={name}
                    editPath={editorPath(section, item.id)}
                    disabled={trashing}
                    onTrash={() => onTrash(item)}
                    onSettings={() => onSettings(item)}
                    onMove={
                      order && !order.disabled
                        ? (place) => order.onMove(item, place)
                        : undefined
                    }
                  />
                </TableCell>
              </>
            )
            const state = selected.has(item.id) ? "selected" : undefined
            return order ? (
              <SortableRow
                key={item.id}
                id={item.id}
                name={name}
                disabled={order.disabled}
                data-state={state}
                data-content-row={item.id}
              >
                {cells}
              </SortableRow>
            ) : (
              <TableRow
                key={item.id}
                data-state={state}
                data-content-row={item.id}
              >
                {cells}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </ListCard>
  )
  return order ? (
    <SortableList
      items={items.map((item) => ({
        id: item.id,
        name: displayTitle(item.title),
      }))}
      words={labels.order.dnd}
      onReorder={order.onReorder}
    >
      {table}
    </SortableList>
  ) : (
    table
  )
}

/**
 * Les catégories d'une ligne, dans l'ordre de la section : la première, et le nombre des autres.
 * Les supprimées sont ignorées.
 */
function CategoriesCell({
  ids,
  all,
}: {
  ids: string[]
  all: Category[] | undefined
}) {
  if (ids.length === 0 || !all) {
    return (
      <span className="text-xs">
        {ids.length === 0 ? labels.noCategory : ""}
      </span>
    )
  }
  const names = categoryNames(ids, all)
  if (names.length === 0) {
    return <span className="text-xs">{labels.noCategory}</span>
  }
  // La première, puis « +2 » : les autres dans l'infobulle (et pour les lecteurs d'écran).
  const [first, ...others] = names
  return (
    <div className="flex items-center gap-1">
      <Badge variant="outline">{first}</Badge>
      {others.length > 0 && (
        <Tooltip>
          <TooltipTrigger render={<Badge variant="secondary" />}>
            {labels.moreCategories(others.length)}
            <span className="sr-only">
              {" "}
              {labels.otherCategories(others.join(", "))}
            </span>
          </TooltipTrigger>
          <TooltipContent>{others.join(", ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function RowActions({
  title,
  editPath,
  disabled,
  onTrash,
  onSettings,
  onMove,
}: {
  title: string
  editPath: string
  disabled: boolean
  onTrash: () => void
  onSettings: () => void
  // Blog, Podcasts, sans recherche ni filtre : « Mettre en tête », « Mettre à la fin ».
  onMove?: (place: "top" | "bottom") => void
}) {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={labels.actions(title)}
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => void navigate(editPath)}>
          <SquarePen />
          {labels.open}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSettings}>
          <Settings2 />
          {labels.settings.action}
        </DropdownMenuItem>
        {onMove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMove("top")}>
              <ArrowUpToLine />
              {labels.order.moveTop}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove("bottom")}>
              <ArrowDownToLine />
              {labels.order.moveBottom}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onTrash}>
          <Eraser />
          {labels.trash}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
