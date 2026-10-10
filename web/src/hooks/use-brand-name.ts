import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { adminBrandKey, brandName, type AdminBrand } from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

/**
 * L'identité de l'admin (nom, logotype, monogramme), lue dès l'ouverture de l'admin (main.tsx) ;
 * undefined le temps de la lecture ou si elle échoue.
 */
export function useBrand(): AdminBrand | undefined {
  return useQuery(adminBrandRead()).data
}

/**
 * Le nom de la marque à afficher (menu, connexion, titre de l'onglet) : vide le temps de la
 * lecture, pour ne pas montrer « Ruche » un instant à la place de la marque ; « Ruche » si elle
 * échoue ou si aucun nom n'est enregistré.
 */
export function useBrandName(): string {
  const { data, isPending, isError } = useQuery(adminBrandRead())
  if (isPending && !isError) return ""
  return brandName(data?.name)
}

/**
 * Enregistre un réglage de l'identité de l'admin (Paramètres) : le message de réussite, puis
 * l'identité relue pour toute l'admin. onSaved : juste avant (remettre un formulaire à zéro) ;
 * errorText : le message d'un échec (sinon « erreur inattendue »).
 */
export function useBrandMutation<V, R = unknown>({
  mutationFn,
  saved,
  onSaved,
  errorText,
}: {
  mutationFn: (variables: V) => Promise<R>
  saved: string | ((variables: V) => string)
  onSaved?: (variables: V) => void
  errorText?: (error: Error) => string
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (_, variables) => {
      onSaved?.(variables)
      toast.success(typeof saved === "function" ? saved(variables) : saved)
      await queryClient.invalidateQueries({ queryKey: adminBrandKey })
    },
    onError: (error) =>
      toast.error(errorText?.(error) ?? texts.common.unexpected),
  })
}
