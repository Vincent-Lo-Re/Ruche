// Les termes de l'admin (Paramètres › Avancé, « Termes » ; ADMIN § 7 bis) : le nom d'une section
// dans l'interface de l'admin, en anglais et en français, avec ses traits. Lus une fois au chargement
// comme la langue de l'admin, pour que tous les textes (`@/texts`) s'en servent ; gardés sur ce
// navigateur, la page se recharge s'ils changent. Seuls les mots affichés changent : ni les
// adresses ni les sortes de contenu. Les formes : lib/term-forms.ts ; la grammaire : texts/grammar/.

import type { Json } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import type { Language } from "@/lib/language"
import {
  TERM_KEYS,
  TERMS_STORAGE_KEY,
  type StoredTerm,
  type TermKey,
  type Traits,
} from "@/lib/term-forms"

export const termsKey = ["terms"] as const

export async function getTerms(): Promise<StoredTerm[]> {
  const { data, error } = await supabase
    .from("admin_terms")
    .select("key, language, name, traits")
    .order("key")
    .order("language")
  if (error) throw error
  return data.map((row) => ({ ...row, traits: row.traits as Traits }))
}

/** Les termes enregistrés, gardés sur ce navigateur ; la page se recharge s'ils ont changé. */
export function applyTerms(terms: readonly StoredTerm[]): void {
  const value = JSON.stringify(
    terms.map(({ key, language, name, traits }) => ({
      key,
      language,
      name,
      traits,
    }))
  )
  try {
    const previous = localStorage.getItem(TERMS_STORAGE_KEY) ?? "[]"
    localStorage.setItem(TERMS_STORAGE_KEY, value)
    if (previous !== value) window.location.reload()
  } catch {
    // Stockage indisponible : les termes valent pour cette visite.
  }
}

/**
 * Enregistre les termes d'une langue de l'interface (admins) : une section nommée remplace le mot
 * par défaut ; une section sans nom (absente de `named`) le retrouve.
 */
export async function saveTerms(
  language: Language,
  named: readonly { key: TermKey; name: string; traits: Traits }[]
): Promise<void> {
  if (named.length > 0) {
    const { error } = await supabase.from("admin_terms").upsert(
      named.map((term) => ({
        ...term,
        language,
        traits: term.traits as NonNullable<Json>,
      }))
    )
    if (error) throw error
  }
  const cleared = TERM_KEYS.filter(
    (key) => !named.some((term) => term.key === key)
  )
  if (cleared.length > 0) {
    const { error } = await supabase
      .from("admin_terms")
      .delete()
      .eq("language", language)
      .in("key", cleared)
    if (error) throw error
  }
}
