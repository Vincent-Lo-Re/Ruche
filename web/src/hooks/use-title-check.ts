import { useQuery } from "@tanstack/react-query"

import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  contentKeys,
  findContentByTitle,
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
  const checked = useDebouncedValue(wanted, 300)
  const active = enabled && hasUniqueTitle(kind) && wanted !== ""
  const query = useQuery({
    queryKey: [...contentKeys.all, "titre", kind, checked, exceptId],
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
