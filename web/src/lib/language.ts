// La langue de l'admin, choisie une fois au chargement : les textes (`@/texts`), les dates et
// les nombres la lisent. En changer recharge la page (ADMIN § 7, « En anglais et en français »).
// Celle du membre (Mon compte) passe avant celle de toute l'admin (Paramètres › Avancé) ; les deux
// sont gardées sur ce navigateur pour être connues dès le chargement, connexion comprise.

import { memberAdminChoice } from "@/lib/stored-choice"

export const LANGUAGES = ["en", "fr"] as const
export type Language = (typeof LANGUAGES)[number]

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

// L'anglais au départ, tant que rien n'est choisi (les parcours Playwright construisent l'admin
// en français : VITE_DEFAULT_LANGUAGE).
const DEFAULT_LANGUAGE: Language = isLanguage(
  import.meta.env.VITE_DEFAULT_LANGUAGE
)
  ? import.meta.env.VITE_DEFAULT_LANGUAGE
  : "en"

// La langue choisie par le membre, et celle de toute l'admin, retenues à la dernière visite.
const choice = memberAdminChoice({
  memberKey: "ruche-langue",
  adminKey: "ruche-langue-admin",
  isValid: isLanguage,
  fallback: DEFAULT_LANGUAGE,
})

export const language: Language = choice.current

/** La langue choisie par le membre dans Mon compte, rangée sur son compte ; null s'il suit l'admin. */
export function memberLanguage(
  metadata: Record<string, unknown> | undefined
): Language | null {
  const chosen = metadata?.language
  return isLanguage(chosen) ? chosen : null
}

/**
 * La langue du membre (null : celle de l'admin), gardée sur ce navigateur. La page se recharge
 * si la langue qui s'applique a changé : tous les textes, même ceux lus au chargement d'un
 * module, passent dans la nouvelle langue.
 */
export const applyMemberLanguage = choice.applyMember

/** La langue de toute l'admin (Paramètres › Avancé), gardée sur ce navigateur. */
export function applyAdminLanguage(next: Language): void {
  choice.applyAdmin(next)
}
