import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { profileQueryKey, useAuth } from "@/auth/auth-context"
import { isAccessLostError } from "@/lib/access-lost"

/**
 * Pour une erreur attrapée hors d'une lecture ou d'un enregistrement de TanStack Query (un
 * try/catch, un résultat partiel) : si la personne n'a plus accès, relit sa fiche, comme le fait
 * déjà lib/query-client.ts pour les autres.
 */
export function useAccessCheck() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const userId = profile?.id

  return useCallback(
    (error: unknown) => {
      if (userId && isAccessLostError(error)) {
        void queryClient.invalidateQueries({
          queryKey: profileQueryKey(userId),
        })
      }
    },
    [queryClient, userId]
  )
}
