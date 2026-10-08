/**
 * L'aide de l'admin (ADMIN § 7, « Un header sur toute la largeur ») : le raccourci qui ouvre sa
 * recherche, et la recherche elle-même, sans React.
 */
import type { HelpFiche, HelpTheme } from "@/help/types"
import { normalizeSearch } from "@/lib/contents/list-filters"

/** ⌘ K sur Mac, Ctrl + K ailleurs : ouvre (ou referme) la recherche de l'aide. */
export function isHelpShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey">,
  apple: boolean
): boolean {
  return (
    event.key.toLowerCase() === "k" &&
    !event.altKey &&
    (apple ? event.metaKey : event.ctrlKey && !event.metaKey)
  )
}

/**
 * La note d'une fiche pour ce qui est tapé (le filtre de `Command`) : 1 si chaque mot tapé se
 * trouve dans son titre, son résumé ou ses mots-clés, sinon 0. Rien de tapé : toutes passent.
 */
export function helpScore(
  value: string,
  search: string,
  keywords: string[] = []
): number {
  const words = normalizeSearch(search).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const haystack = normalizeSearch([value, ...keywords].join(" "))
  return words.every((word) => haystack.includes(word)) ? 1 : 0
}

/** Les fiches rangées par thème, dans l'ordre des thèmes donné (les thèmes vides sont omis). */
export function fichesByTheme(
  fiches: readonly HelpFiche[],
  themes: readonly HelpTheme[]
): { theme: HelpTheme; fiches: HelpFiche[] }[] {
  return themes
    .map((theme) => ({
      theme,
      fiches: fiches.filter((fiche) => fiche.theme === theme),
    }))
    .filter((group) => group.fiches.length > 0)
}
