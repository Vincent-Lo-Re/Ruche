import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import { trashMany } from "@/lib/bulk-trash"
import {
  CategoryError,
  categoryKeys,
  deleteCategory,
  type Category,
} from "@/lib/categories"
import { contentKeys } from "@/lib/contents/api"
import { errorMessage } from "@/lib/errors"
import { texts } from "@/texts"

const labels = texts.categories

/**
 * Les catégories cochées de l'onglet « Catégories » et leur suppression définitive, une à une
 * (une catégorie qui a disparu entre-temps n'arrête pas les autres). Tenu par la page : le
 * bouton « Supprimer définitivement (n) » est en tête de page, à côté de « Nouvelle catégorie »,
 * comme pour les contenus.
 */
export function useCategoriesBulk() {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const removeMany = useMutation({
    // Une catégorie déjà supprimée ailleurs est passée : les autres continuent.
    mutationFn: (items: Category[]) =>
      trashMany(items, deleteCategory, (error) =>
        error instanceof CategoryError && error.code === "introuvable"
          ? error.message
          : null
      ),
    onSuccess: (result) => {
      if (result.trashed.length > 0)
        toast.success(labels.removedMany(result.trashed.length))
      if (result.error) {
        toast.error(errorMessage(result.error))
        checkAccess(result.error)
      } else setSelected(new Set())
    },
    onError: (error) => {
      toast.error(error.message)
      checkAccess(error)
    },
    onSettled: async () => {
      setConfirming(false)
      // Les listes du Blog ou des Podcasts montrent les noms : relues aussi.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: contentKeys.lists }),
      ])
    },
  })

  return { selected, setSelected, confirming, setConfirming, removeMany }
}

export type CategoriesBulk = ReturnType<typeof useCategoriesBulk>
