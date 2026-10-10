import { useQueryClient } from "@tanstack/react-query"

import { useTrashMany } from "@/hooks/use-trash-many"
import type { BulkTrashResult } from "@/lib/bulk-trash"
import {
  mediaKeys,
  restoreMedia,
  trashKey,
  trashMedia,
  usedFileDetail,
} from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { texts } from "@/texts"

/**
 * Mise à la corbeille des fichiers cochés, avec « Annuler » dans le message (comme depuis la
 * fiche d'un fichier) ; un fichier encore utilisé est gardé. onDone reçoit ce qui est parti, ce
 * qui est gardé, et l'erreur éventuelle.
 */
export function useBulkTrash(onDone: (result: BulkTrashResult<Media>) => void) {
  const queryClient = useQueryClient()
  return useTrashMany({
    trash: trashMedia,
    keptDetail: usedFileDetail,
    restore: restoreMedia,
    refresh: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
        queryClient.invalidateQueries({ queryKey: trashKey }),
      ]),
    words: texts.media.selection,
    // La corbeille rend les fichiers protégés tout de suite (fonction « files »).
    needsFileSync: () => true,
    onDone: (result: BulkTrashResult<Media> | null) => {
      if (result) onDone(result)
    },
  })
}
