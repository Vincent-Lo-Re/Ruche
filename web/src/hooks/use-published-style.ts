import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { neutralStyle, type AppStyle } from "@/lib/app-style/style"
import { appStyleRead } from "@/lib/reads"
import { texts } from "@/texts"

/**
 * La charte de l'app que voient les lecteurs : la version publiée, sinon la charte neutre (aussi
 * le temps de la lire). Le téléphone de l'éditeur s'en habille.
 */
export function usePublishedStyle(): AppStyle {
  const row = useQuery(appStyleRead())
  const published = row.data?.published ?? null
  return useMemo(
    () => published ?? neutralStyle(texts.appStyle.neutral),
    [published]
  )
}
