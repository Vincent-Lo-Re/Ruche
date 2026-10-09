// Les termes en anglais (ADMIN § 7 bis) : sans article qui s'accorde, le nom suffit.
// Sans dépendance, comme les textes qui s'en servent.

import { termIn, type Term, type TermKey } from "../../lib/term-forms.ts"

// Les mots de l'admin, tant qu'aucun terme n'est enregistré en anglais.
const DEFAULTS: Record<TermKey, Term> = {
  blog: { name: "Blog", traits: {} },
  podcasts: { name: "Podcasts", traits: { plural: true } },
}

/** Le terme d'une section en anglais (ou le mot par défaut). */
export const englishTerm = (key: TermKey): Term =>
  termIn(key, "en", DEFAULTS[key])

/** Une phrase avec ce terme, pour le vérifier dans Paramètres. */
export const englishSample = ({ name }: Term) => `In the ${name} list`
