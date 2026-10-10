import { createContext, use } from "react"

import type { AppStyle, StyleMode } from "@/lib/app-style/style"

/**
 * La charte de l'app que montre le téléphone de l'éditeur (la version publiée, sinon la neutre),
 * et son mode : les encadrés y lisent leur teinte, le réglage d'un encadré la liste des teintes.
 * Sans elle (« Mes blocs »), les blocs gardent les couleurs de l'aperçu.
 */
export const BlocksStyleContext = createContext<{
  style: AppStyle
  mode: StyleMode
} | null>(null)

export function useBlocksStyle() {
  return use(BlocksStyleContext)
}
