import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"

import { announceRestore } from "@/components/contents/announce-restore"
import type { SelectAll } from "@/components/bulk-selection"
import { useTrashMany } from "@/hooks/use-trash-many"
import {
  selectionOf,
  toggleAll,
  toggleSelected,
  type BulkTrashResult,
  type Kept,
} from "@/lib/bulk-trash"
import { keptContentDetail } from "@/lib/contents/api"
import {
  restoreContent,
  trashContent,
  type Trashed,
} from "@/lib/contents/publication"
import { refreshAfterContentTrash } from "@/lib/refresh"

type Row = { id: string; title: string }

type Words = {
  trashedMany: (count: number) => string
  restoredMany: (count: number) => string
}

/**
 * Sélection en masse d'une liste de contenus (listes des sections, Modèles de bloc) : les lignes
 * cochées parmi celles affichées (shown), « Tout sélectionner », la confirmation, puis la mise à
 * la corbeille une par une ; une ligne que la base garde (quelqu'un d'autre l'écrit, modèle
 * encore utilisé) reste cochée et listée (kept).
 */
export function useContentsSelection<T extends Row>({
  shown,
  words,
  nameOf,
}: {
  shown: readonly T[]
  words: Words
  nameOf: (item: T) => string
}) {
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [kept, setKept] = useState<Kept<T>[]>([])
  const [confirming, setConfirming] = useState(false)
  // « Tout sélectionner » : le focus y revient quand le bouton « Mettre à la corbeille » disparaît.
  const selectAllRef = useRef<HTMLSpanElement>(null)
  const selection = selectionOf(checkedIds, shown)

  const trash = useBulkTrash<T>({
    words,
    nameOf,
    onDone: (result) => {
      setConfirming(false)
      if (!result) return
      setCheckedIds((current) => {
        const next = new Set(current)
        for (const item of result.trashed) next.delete(item.id)
        return next
      })
      setKept(result.kept)
      if (result.kept.length === 0 && result.error === null)
        selectAllRef.current?.focus()
    },
  })

  const selectAll: SelectAll = {
    all: selection.all,
    some: selection.some,
    disabled: trash.isPending,
    onToggleAll: (checked) =>
      setCheckedIds((current) => toggleAll(current, shown, checked)),
    checkboxRef: selectAllRef,
  }

  return {
    selection,
    selectAll,
    checkedIds,
    kept,
    pending: trash.isPending,
    confirming,
    toggle: (item: T, checked: boolean) =>
      setCheckedIds((current) => toggleSelected(current, item.id, checked)),
    closeKept: () => {
      setKept([])
      selectAllRef.current?.focus()
    },
    askConfirm: () => setConfirming(true),
    cancel: () => setConfirming(false),
    confirm: () => trash.mutate(selection.items),
  }
}

/**
 * Mise à la corbeille des contenus cochés, un par un. « Annuler » dans le message les ramène en
 * brouillon. onDone reçoit le résultat (null si l'envoi a échoué).
 */
function useBulkTrash<T extends Row>({
  words,
  nameOf,
  onDone,
}: {
  words: Words
  nameOf: (item: T) => string
  onDone: (result: BulkTrashResult<T, Trashed> | null) => void
}) {
  const queryClient = useQueryClient()
  return useTrashMany({
    trash: trashContent,
    keptDetail: keptContentDetail,
    restore: restoreContent,
    refresh: () => refreshAfterContentTrash(queryClient),
    words: { trashed: words.trashedMany, restored: words.restoredMany },
    // Leurs fichiers redeviennent peut-être protégés : tout de suite.
    needsFileSync: (result) =>
      result.results.some((trashed) => trashed.needsFileSync),
    onRestored: (items, restored) =>
      restored.forEach((result, index) =>
        announceRestore(nameOf(items[index]), result)
      ),
    onDone,
  })
}
