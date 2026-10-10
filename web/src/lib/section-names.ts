// Les noms du Blog et des Podcasts (Paramètres › Avancé, décidé le 09/10/2026) : chaque forme
// écrite à la main par un admin, en français (le nom, avec « le », avec « du ») et en anglais (le
// nom). Gardés sur ce navigateur, comme la langue, pour que les textes (`@/texts`, lus au
// chargement) les prennent dès le départ ; s'ils changent, la page se recharge.

// Imports relatifs, sans le DOM : les parcours Playwright lisent aussi les textes (texts/fr.ts).
import { defaultSectionNames } from "../texts/section-names.ts"
import { readStored, writeStored } from "./stored-choice.ts"

type Language = keyof typeof defaultSectionNames

export const NAMED_SECTIONS = ["blog", "podcasts"] as const
export type NamedSection = (typeof NAMED_SECTIONS)[number]

/** Les formes d'un nom : seul (« Le Journal »), avec « le » (« le Journal »), avec « du » (« du Journal »). */
export type SectionForms = { name: string; le: string; du: string }

/** Ce que l'admin a écrit ; null : le nom d'origine. */
export type CustomSectionNames = {
  fr: Record<NamedSection, SectionForms | null>
  en: Record<NamedSection, string | null>
}

export const NO_CUSTOM_NAMES: CustomSectionNames = {
  fr: { blog: null, podcasts: null },
  en: { blog: null, podcasts: null },
}

const KEY = "ruche-noms-sections"

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null

function formsOf(value: unknown): SectionForms | null {
  const forms = value as Partial<Record<keyof SectionForms, unknown>> | null
  const name = text(forms?.name)
  const le = text(forms?.le)
  const du = text(forms?.du)
  return name && le && du ? { name, le, du } : null
}

/** Les noms gardés sur ce navigateur (rien d'illisible : le nom d'origine). */
function read(): CustomSectionNames {
  try {
    const stored = JSON.parse(readStored(KEY) ?? "null") as {
      fr?: Record<string, unknown>
      en?: Record<string, unknown>
    } | null
    return {
      fr: {
        blog: formsOf(stored?.fr?.blog),
        podcasts: formsOf(stored?.fr?.podcasts),
      },
      en: {
        blog: text(stored?.en?.blog),
        podcasts: text(stored?.en?.podcasts),
      },
    }
  } catch {
    // Valeur illisible.
    return NO_CUSTOM_NAMES
  }
}

const stored = read()

/** Les formes de chaque nom dans cette langue : celles de l'admin, sinon celles d'origine. */
export function resolveSectionNames(
  custom: CustomSectionNames,
  language: Language
): Record<NamedSection, SectionForms> {
  const forms = (section: NamedSection): SectionForms => {
    if (language === "fr") {
      return custom.fr[section] ?? defaultSectionNames.fr[section]
    }
    const name = custom.en[section]
    return name ? { name, le: name, du: name } : defaultSectionNames.en[section]
  }
  return { blog: forms("blog"), podcasts: forms("podcasts") }
}

/** Les noms de cette visite, dans cette langue (lus par les textes au chargement). */
export function sectionNamesFor(
  language: Language
): Record<NamedSection, SectionForms> {
  return resolveSectionNames(stored, language)
}

/** Les noms lus dans la base : gardés sur ce navigateur ; la page se recharge s'ils ont changé. */
export function applySectionNames(next: CustomSectionNames): void {
  if (JSON.stringify(next) === JSON.stringify(stored)) return
  // Pas de stockage : les noms d'origine, et pas de rechargement sans fin.
  if (!writeStored(KEY, JSON.stringify(next))) return
  ;(globalThis as { location?: { reload(): void } }).location?.reload()
}
