import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  brandName,
  identityKeys,
  type AdminBrand,
  type BrandIdentity,
  type IdentityTarget,
} from "@/lib/admin-identity"
import { adminBrandRead, identityRead } from "@/lib/reads"
import { texts } from "@/texts"

/**
 * L'identité de l'admin (nom, logotype, monogramme), lue dès l'ouverture de l'admin (main.tsx) ;
 * undefined le temps de la lecture ou si elle échoue.
 */
export function useBrand(): AdminBrand | undefined {
  return useQuery(adminBrandRead()).data
}

/**
 * Une identité réglée par les cartes de Paramètres (l'admin) ou d'App mobile › Identité (l'app) ;
 * undefined le temps de la lecture ou si elle échoue.
 */
export function useIdentity(target: IdentityTarget): BrandIdentity | undefined {
  return useQuery(identityRead(target)).data
}

/**
 * Le nom de la marque à afficher (menu, connexion, titre de l'onglet ; celui de l'app dans ses
 * aperçus) : vide le temps de la lecture, pour ne pas montrer « Ruche » un instant à la place de
 * la marque ; « Ruche » si elle échoue ou si aucun nom n'est enregistré.
 */
export function useBrandName(target: IdentityTarget = "admin"): string {
  const { data, isPending, isError } = useQuery(identityRead(target))
  if (isPending && !isError) return ""
  return brandName(data?.name)
}

/**
 * Enregistre un réglage d'une identité (celle de l'admin dans Paramètres, celle de l'app dans App
 * mobile › Identité) : le message de réussite, puis l'identité relue. onSaved : juste avant
 * (remettre un formulaire à zéro) ; errorText : le message d'un échec (sinon « erreur
 * inattendue »).
 */
export function useBrandMutation<V, R = unknown>({
  mutationFn,
  saved,
  onSaved,
  errorText,
  target = "admin",
}: {
  mutationFn: (variables: V) => Promise<R>
  saved: string | ((variables: V) => string)
  onSaved?: (variables: V) => void
  errorText?: (error: Error) => string
  target?: IdentityTarget
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (_, variables) => {
      onSaved?.(variables)
      toast.success(typeof saved === "function" ? saved(variables) : saved)
      await queryClient.invalidateQueries({ queryKey: identityKeys[target] })
    },
    onError: (error) =>
      toast.error(errorText?.(error) ?? texts.common.unexpected),
  })
}
