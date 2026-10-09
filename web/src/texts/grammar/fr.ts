// La grammaire française des termes (ADMIN § 7 bis) : l'article qui va avec le genre, le nombre et
// l'élision d'un nom de section (« du Blog », « de la Revue », « de l'Agenda », « des Actualités »).
// Sans dépendance, comme les textes qui s'en servent.

import { termIn, type Term, type TermKey } from "../../lib/term-forms.ts"

// Les mots de l'admin, tant qu'aucun terme n'est enregistré en français.
const DEFAULTS: Record<TermKey, Term> = {
  blog: { name: "Blog", traits: { gender: "masculine" } },
  podcasts: { name: "Podcasts", traits: { gender: "masculine", plural: true } },
}

/** Le terme d'une section en français (ou le mot par défaut). */
export const frenchTerm = (key: TermKey): Term =>
  termIn(key, "fr", DEFAULTS[key])

type Preposition = "le" | "de" | "à"

const ARTICLES: Record<
  Preposition,
  { plural: string; elided: string; masculine: string; feminine: string }
> = {
  le: { plural: "les ", elided: "l'", masculine: "le ", feminine: "la " },
  de: { plural: "des ", elided: "de l'", masculine: "du ", feminine: "de la " },
  à: { plural: "aux ", elided: "à l'", masculine: "au ", feminine: "à la " },
}

function withArticle({ name, traits }: Term, preposition: Preposition): string {
  const articles = ARTICLES[preposition]
  const article = traits.plural
    ? articles.plural
    : traits.elided
      ? articles.elided
      : traits.gender === "feminine"
        ? articles.feminine
        : articles.masculine
  return `${article}${name}`
}

/** « le Blog », « la Revue », « l'Agenda », « les Actualités ». */
export const le = (term: Term) => withArticle(term, "le")
/** « du Blog », « de la Revue », « de l'Agenda », « des Actualités ». */
export const du = (term: Term) => withArticle(term, "de")
/** « au Blog », « à la Revue », « à l'Agenda », « aux Actualités ». */
const au = (term: Term) => withArticle(term, "à")

/** En début de phrase : « Le Blog », « L'Agenda ». */
export function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase("fr") + text.slice(1)
}

/** Des phrases avec ce terme, pour vérifier les accords dans Paramètres. */
export function frenchSample(term: Term): string {
  return [capitalized(le(term)), `dans la liste ${du(term)}`, au(term)].join(
    " · "
  )
}
