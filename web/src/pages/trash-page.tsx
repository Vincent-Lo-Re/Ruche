import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Eraser,
  FileText,
  GalleryHorizontalEnd,
  ListFilter,
  RotateCcw,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { announceRestore } from "@/components/contents/announce-restore"
import { ListCard, ListEmpty } from "@/components/list-card"
import { SelectAllHead } from "@/components/bulk-selection"
import { LoadState, RefreshFailed } from "@/components/load-state"
import { kindIcons } from "@/components/media/media-kinds"
import { PageHeader } from "@/components/page-header"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { TruncatedText } from "@/components/truncated-text"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAddressState } from "@/hooks/use-address-state"
import { selectionOf, toggleAll, toggleSelected } from "@/lib/bulk-trash"
import { trashFilterFromAddress, writeTrashFilter } from "@/lib/address"
import { ContentError, contentKeys } from "@/lib/contents/api"
import { formatDate, formatDateTime } from "@/lib/dates"
import {
  emptyTrash,
  kickFiles,
  mediaKeys,
  restoreTrashItem,
  trashKey,
  type TrashItem,
} from "@/lib/media/api"
import { isMediaKind } from "@/lib/media/constants"
import { trashRead } from "@/lib/reads"
import { contentEditorPath, sections } from "@/navigation"
import { filterTrash, trashFilters, trashTypeLabel } from "@/lib/trash"
import { displayTitle } from "@/lib/titles"
import { ListPagination } from "@/components/list-pagination"
import { usePagination } from "@/hooks/use-pagination"
import { PAGE_SIZE } from "@/lib/pagination"
import { texts } from "@/texts"

// Ce qui attend une confirmation : tout vider, effacer la sélection, ou un seul élément.
type Confirmation =
  | { scope: "all"; items: TrashItem[] }
  | { scope: "selection"; items: TrashItem[] }
  | { scope: "item"; item: TrashItem }

const keyOf = (item: TrashItem) => `${item.item_type}-${item.id}`

/**
 * Corbeille commune à toute l'admin : contenus et fichiers, filtre par type, restaurer (en
 * brouillon pour un contenu, [D18]), effacer un élément ou une sélection, vider. Ce qui est
 * effacé est toujours la liste affichée, jamais « tout ce qu'il y a » côté serveur.
 */
export function TrashPage() {
  const { title, description } = texts.sections.trash
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // Gardé dans l'adresse : on retrouve le filtre en revenant à la Corbeille.
  const [filter, setFilter] = useAddressState(
    trashFilterFromAddress,
    writeTrashFilter
  )
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const trash = useQuery(trashRead())

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trashKey }),
      queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
      queryClient.invalidateQueries({ queryKey: contentKeys.all }),
    ])

  const restore = useMutation({
    mutationFn: restoreTrashItem,
    onSuccess: ({ addressRemoved, renamedTo }, item) => {
      const name = displayTitle(item.title)
      // Un contenu restauré s'ouvre depuis le message.
      const path =
        item.item_type === "content"
          ? contentEditorPath(item.kind, item.id)
          : null
      const action = path
        ? { label: texts.common.open, onClick: () => void navigate(path) }
        : undefined
      announceRestore(
        name,
        { addressRemoved, renamedTo },
        {
          success: texts.trash.restored(name),
          // Un modèle ne se publie pas : rien à dire de l'app.
          description:
            item.item_type === "content" && item.kind !== "template"
              ? texts.trash.restoredDraft
              : undefined,
          action,
        }
      )
    },
    onError: (error) => {
      toast.error(error.message, {
        description:
          error instanceof ContentError
            ? (error.detail ?? undefined)
            : undefined,
      })
    },
    onSettled: refresh,
  })

  const erase = useMutation({
    mutationFn: (items: TrashItem[]) =>
      emptyTrash(items.map((item) => ({ type: item.item_type, id: item.id }))),
    onSuccess: (count) => {
      toast.success(texts.trash.emptied(count))
      setSelected(new Set())
      // Effacement des fichiers tout de suite, sans attendre la tâche planifiée, mais sans
      // bloquer la fenêtre : la demande est enregistrée, la liste est relue une fois
      // l'effacement fait.
      void kickFiles().then(refresh)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setConfirmation(null)
      void refresh()
    },
  })

  const items = trash.data ?? []
  const filters = trashFilters(items)
  // Un filtre dont le dernier élément vient de partir revient à « Tout ».
  const activeFilter = filters.includes(filter) ? filter : "all"
  // Une page (25 lignes) ; changer de filtre ramène à la première. La sélection porte sur la page.
  const paged = usePagination(
    filterTrash(items, activeFilter),
    PAGE_SIZE,
    activeFilter
  )
  const shown = paged.items
  const checked = selectionOf(selected, shown, keyOf)
  const selection = checked.items
  const busy = restore.isPending || erase.isPending

  const toggle = (item: TrashItem, on: boolean) =>
    setSelected((current) => toggleSelected(current, keyOf(item), on))

  const confirm = () => {
    if (!confirmation) return
    erase.mutate(
      confirmation.scope === "item" ? [confirmation.item] : confirmation.items
    )
  }

  return (
    <>
      <PageHeader
        icon={sections.trash.icon}
        title={title}
        description={description}
        actions={
          <>
            {selection.length > 0 && (
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  setConfirmation({ scope: "selection", items: selection })
                }
              >
                <Eraser />
                {texts.trash.eraseSelection(selection.length)}
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={items.length === 0 || busy}
              onClick={() => setConfirmation({ scope: "all", items })}
            >
              <Eraser />
              {texts.trash.empty}
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          variant="outline"
          aria-label={texts.trash.filters.label}
          value={[activeFilter]}
          onValueChange={(value: string[]) => {
            const next = filters.find((option) => option === value[0])
            if (next) setFilter(next)
          }}
        >
          {filters.map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {option === "all" && <GalleryHorizontalEnd />}
              {texts.trash.filters[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {trash.data === undefined ? (
        <ListCard>
          <LoadState query={trash} failed={texts.trash.loadFailed} />
        </ListCard>
      ) : (
        <div className="space-y-4">
          <RefreshFailed query={trash} text={texts.trash.refreshFailed} />
          {items.length === 0 ? (
            <ListEmpty
              icon={Eraser}
              title={texts.trash.emptyState.title}
              description={texts.trash.emptyState.description}
            />
          ) : shown.length === 0 ? (
            <ListEmpty icon={ListFilter} title={texts.trash.emptyFilter} />
          ) : (
            <ListCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SelectAllHead
                      all={checked.all}
                      some={checked.some}
                      disabled={busy}
                      onToggleAll={(on) =>
                        setSelected((current) =>
                          toggleAll(current, shown, on, keyOf)
                        )
                      }
                    />
                    <TableHead>{texts.trash.columns.name}</TableHead>
                    <TableHead>{texts.trash.columns.type}</TableHead>
                    <TableHead>{texts.trash.columns.deletedAt}</TableHead>
                    <TableHead>{texts.trash.columns.purgeAt}</TableHead>
                    <TableHead className="w-0">
                      <span className="sr-only">{texts.common.actions}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((item) => (
                    <TrashRow
                      key={keyOf(item)}
                      item={item}
                      checked={selected.has(keyOf(item))}
                      disabled={busy}
                      onCheck={(checked) => toggle(item, checked)}
                      onRestore={() => restore.mutate(item)}
                      onErase={() => setConfirmation({ scope: "item", item })}
                    />
                  ))}
                </TableBody>
              </Table>
            </ListCard>
          )}
          <ListPagination pagination={paged} />
        </div>
      )}

      <ConfirmDialog
        open={confirmation !== null}
        {...confirmationWords(confirmation)}
        pending={erase.isPending}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirm}
      />
    </>
  )
}

/** Le titre, la description et le bouton d'une confirmation (tout, la sélection, un élément). */
function confirmationWords(confirmation: Confirmation | null) {
  if (!confirmation) return { title: "", description: "", confirmLabel: "" }
  if (confirmation.scope === "all") {
    const words = texts.trash.confirmEmpty
    return {
      title: words.title,
      description: words.description(confirmation.items.length),
      confirmLabel: words.confirm,
    }
  }
  if (confirmation.scope === "selection") {
    const words = texts.trash.confirmSelection
    return {
      title: words.title(confirmation.items.length),
      description: words.description(confirmation.items.length),
      confirmLabel: texts.common.deletePermanently,
    }
  }
  const words = texts.trash.confirmErase
  return {
    title: words.title,
    description: words.description(displayTitle(confirmation.item.title)),
    confirmLabel: texts.common.deletePermanently,
  }
}

function TrashRow({
  item,
  checked,
  disabled,
  onCheck,
  onRestore,
  onErase,
}: {
  item: TrashItem
  checked: boolean
  disabled: boolean
  onCheck: (checked: boolean) => void
  onRestore: () => void
  onErase: () => void
}) {
  const name = displayTitle(item.title)
  const Icon =
    item.item_type === "file" && isMediaKind(item.kind)
      ? kindIcons[item.kind]
      : FileText
  return (
    <TableRow data-state={checked ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          aria-label={texts.selection.select(name)}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheck(value)}
        />
      </TableCell>
      <TableCell className="max-w-80">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <TruncatedText as="span" text={name} className="font-medium" />
        </div>
      </TableCell>
      <TableCell>{trashTypeLabel(item)}</TableCell>
      <TableCell>
        <div>{formatDateTime(item.deleted_at)}</div>
        {item.deleted_by_name && (
          <div className="text-muted-foreground">
            {texts.common.by(item.deleted_by_name)}
          </div>
        )}
      </TableCell>
      <TableCell>
        {item.purge_error ? (
          <div className="max-w-72 space-y-1 whitespace-normal">
            <Badge variant="destructive">
              <TriangleAlert />
              {texts.trash.purgeRefused}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {texts.trash.purgeRefusedHint}
            </p>
          </div>
        ) : (
          // Le jour seul : la tâche qui vide la Corbeille passe une fois par nuit.
          texts.trash.purgeOn(formatDate(item.purge_at))
        )}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={texts.trash.restoreItem(name)}
            onClick={onRestore}
          >
            <RotateCcw />
            {texts.trash.restore}
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="destructive"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={texts.trash.eraseItem(name)}
                  onClick={onErase}
                />
              }
            >
              <Eraser />
            </TooltipTrigger>
            <TooltipContent>{texts.common.deletePermanently}</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  )
}
