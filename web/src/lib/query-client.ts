import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

import { isAccessLostError } from "@/lib/access-lost"

/**
 * Mémoire des données chargées (TanStack Query), commune à toute l'admin. Toute lecture ou tout
 * enregistrement qui répond « plus d'accès » relit la fiche du membre (auth-provider.tsx) : le
 * menu et les pages réservées suivent aussitôt, sans attendre un rechargement, et aucun écran
 * n'a à y penser.
 */
export function createQueryClient() {
  const onError = (error: unknown) => {
    if (isAccessLostError(error))
      void client.invalidateQueries({ queryKey: ["profile"] })
  }
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        // Les données restent fraîches 30 secondes, puis sont relues au besoin.
        staleTime: 30_000,
        retry: 1,
      },
    },
  })
  return client
}
