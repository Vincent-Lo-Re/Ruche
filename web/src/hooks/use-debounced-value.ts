import { useEffect, useState } from "react"

// Le temps laissé après la dernière touche avant de chercher (listes, choix d'un fichier)…
export const SEARCH_DELAY_MS = 250
// … et avant de demander à la base si un titre ou une adresse est libre.
export const CHECK_DELAY_MS = 300

/** La valeur donnée, mais seulement une fois qu'elle n'a plus changé pendant `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
