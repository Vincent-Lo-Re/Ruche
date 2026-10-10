import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import { restoreMany, trashMany, type BulkTrashResult } from "@/lib/bulk-trash"
import { errorMessage } from "@/lib/errors"
import { kickFiles } from "@/lib/media/api"
import { texts } from "@/texts"

/**
 * Mise à la corbeille des lignes cochées, une par une (lib/bulk-trash.ts), avec « Annuler » dans
 * le message : les lignes reviennent. Une ligne refusée pour une raison attendue est gardée
 * (kept). Ensuite, la fonction « files » rend les fichiers protégés tout de suite si besoin
 * (needsFileSync), et refresh relit les listes. onDone reçoit le résultat (null si l'envoi a
 * échoué) ; onRestored, ce que la base a répondu pour chaque ligne revenue.
 */
export function useTrashMany<T extends { id: string }, R, S>({
  trash,
  keptDetail,
  restore,
  refresh,
  words,
  needsFileSync,
  onRestored,
  onDone,
}: {
  trash: (id: string) => Promise<R>
  keptDetail: (error: unknown) => string | null
  restore: (id: string) => Promise<S>
  refresh: () => Promise<unknown>
  words: {
    trashed: (count: number) => string
    restored: (count: number) => string
  }
  needsFileSync: (result: BulkTrashResult<T, R>) => boolean
  onRestored?: (items: T[], restored: S[]) => void
  onDone: (result: BulkTrashResult<T, R> | null) => void
}) {
  const checkAccess = useAccessCheck()

  const undo = async (items: T[]) => {
    const { restored, error } = await restoreMany(
      items.map((item) => item.id),
      restore
    )
    if (restored.length > 0) toast.success(words.restored(restored.length))
    onRestored?.(items, restored)
    if (error) toast.error(errorMessage(error))
    await refresh()
  }

  return useMutation({
    mutationFn: (items: T[]) => trashMany(items, trash, keptDetail),
    onSuccess: (result) => {
      if (result.trashed.length > 0) {
        toast.success(words.trashed(result.trashed.length), {
          action: {
            label: texts.common.undo,
            onClick: () => void undo(result.trashed),
          },
        })
        if (needsFileSync(result)) void kickFiles()
      }
      if (result.error) {
        toast.error(errorMessage(result.error))
        checkAccess(result.error)
      }
      onDone(result)
    },
    onError: (error) => {
      toast.error(errorMessage(error))
      onDone(null)
    },
    onSettled: refresh,
  })
}
