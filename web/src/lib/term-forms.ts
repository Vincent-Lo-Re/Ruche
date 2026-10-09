// Les termes de l'admin (ADMIN § 7 bis) tels que les textes les lisent : le nom d'une section dans
// une langue de l'interface, et ses traits grammaticaux, gardés sur ce navigateur (lib/terms.ts les
// relit dans la base). Sans aucune dépendance : les textes de chaque langue s'en servent,
// jusque dans les tests de parcours, hors du navigateur. La grammaire est dans les textes de chaque
// langue (texts/grammar/), pas ici.

/** Les sections dont le nom se change (les métiers à venir s'ajouteront ici). */
export const TERM_KEYS = ["blog", "podcasts"] as const
export type TermKey = (typeof TERM_KEYS)[number]

export type Gender = "masculine" | "feminine"

/** Les traits grammaticaux d'un terme : le genre et l'élision en français, le nombre partout. */
export type Traits = {
  gender?: Gender
  plural?: boolean
  elided?: boolean
}

export type Term = { name: string; traits: Traits }

export type StoredTerm = Term & { key: string; language: string }

/** Où les termes sont gardés sur ce navigateur. */
export const TERMS_STORAGE_KEY = "ruche-termes"

function isStoredTerm(value: unknown): value is StoredTerm {
  const term = value as StoredTerm
  return (
    typeof term === "object" &&
    term !== null &&
    typeof term.key === "string" &&
    typeof term.language === "string" &&
    typeof term.name === "string" &&
    typeof term.traits === "object" &&
    term.traits !== null
  )
}

function readStored(): StoredTerm[] {
  // Hors du navigateur (tests de parcours) : les mots par défaut.
  if (typeof localStorage === "undefined") return []
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(TERMS_STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(stored) ? stored.filter(isStoredTerm) : []
  } catch {
    // Stockage indisponible ou abîmé : les mots par défaut.
    return []
  }
}

const stored = readStored()

/** Le terme d'une section dans une langue : celui enregistré, sinon le mot par défaut des textes. */
export function termIn(key: TermKey, language: string, fallback: Term): Term {
  const found = stored.find(
    (term) => term.key === key && term.language === language
  )
  return found ? { name: found.name, traits: found.traits } : fallback
}
