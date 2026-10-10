import { useQuery } from "@tanstack/react-query"

import { CHECK_DELAY_MS, useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  contentKeys,
  findContentByTitle,
  findPageBySlug,
  hasUniqueTitle,
  type ContentKind,
} from "@/lib/contents/api"

/**
 * Le titre est-il déjà pris dans la section ? Vérifié pendant qu'on tape (300 ms après la
 * dernière touche), sans le contenu lui-même (exceptId). pending : la réponse pour ce titre
 * n'est pas encore là ; takenBy : le contenu qui le porte. Un modèle de bloc, un titre vide ou
 * enabled faux : jamais pris.
 */
export function useTitleCheck(
  kind: ContentKind,
  title: string,
  exceptId: string | null = null,
  enabled = true
) {
  const wanted = title.trim()
  const checked = useDebouncedValue(wanted, CHECK_DELAY_MS)
  const active = enabled && hasUniqueTitle(kind) && wanted !== ""
  const query = useQuery({
    queryKey: contentKeys.titleTaken(kind, checked, exceptId),
    queryFn: () => findContentByTitle(kind, checked, exceptId),
    enabled: active && checked !== "",
    staleTime: 0,
  })
  const pending = active && (wanted !== checked || query.isPending)
  return {
    pending,
    takenBy: active && !pending ? (query.data ?? null) : null,
  }
}

/**
 * L'adresse d'une nouvelle page est-elle déjà prise ? Vérifiée comme le titre, un instant après
 * la dernière touche. pending : la réponse pour cette adresse n'est pas encore là ; takenBy : la
 * page qui la porte. Une adresse vide n'est jamais prise.
 */
export function useSlugCheck(slug: string) {
  const checked = useDebouncedValue(slug, CHECK_DELAY_MS)
  const query = useQuery({
    queryKey: contentKeys.slugTaken(checked),
    queryFn: () => findPageBySlug(checked),
    enabled: checked !== "",
    staleTime: 0,
  })
  const pending = slug !== "" && (slug !== checked || query.isPending)
  return { pending, takenBy: !pending ? (query.data ?? null) : null }
}
