import { createContext, use } from "react"

/**
 * La place des actions de l'onglet ouvert de la section « App », à droite des onglets, dans la
 * ligne qui reste en haut quand la page défile (la charte y met son état et « Publier »). La
 * ligne elle-même, pour placer dessous ce qui reste aussi en haut.
 */
export const AppTabActionsContext = createContext<{
  slot: HTMLElement | null
  bar: HTMLElement | null
}>({ slot: null, bar: null })

export function useAppTabActions() {
  return use(AppTabActionsContext)
}
