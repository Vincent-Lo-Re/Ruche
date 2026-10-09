// Le format régional de l'admin (« fr-FR », « en-GB »), choisi une fois au chargement comme la
// langue : l'écriture des dates (lib/dates.ts), de l'heure sur 12 ou 24 heures, l'ordre du jour et
// du mois à la saisie, et celle des nombres (lib/media/format.ts). C'est le navigateur (Intl) qui
// sait écrire chaque format : une langue ou un format de plus ne touche pas lib/dates.ts.
// Celui du membre (Mon compte) passe avant celui de toute l'admin (Paramètres › Avancé), qui
// passe avant celui de la langue ; les deux sont gardés sur ce navigateur, et la page se recharge
// si celui qui s'applique change.

import { language, type Language } from "@/lib/language"

/** Les formats proposés : ceux des langues de l'admin, et leurs voisins les plus courants. */
export const REGIONAL_FORMATS = [
  "fr-FR",
  "fr-BE",
  "fr-CA",
  "fr-CH",
  "en-US",
  "en-GB",
  "en-CA",
  "en-AU",
  "de-DE",
  "de-CH",
  "es-ES",
  "it-IT",
  "nl-NL",
  "pt-PT",
  "pt-BR",
] as const

export type RegionalFormat = (typeof REGIONAL_FORMATS)[number]

export function isRegionalFormat(value: unknown): value is RegionalFormat {
  return REGIONAL_FORMATS.includes(value as RegionalFormat)
}

/** Le format qui va avec une langue, tant qu'aucun n'est choisi. */
export function languageFormat(of: Language): RegionalFormat {
  return of === "fr" ? "fr-FR" : "en-US"
}

const MEMBER_KEY = "ruche-format"
const ADMIN_KEY = "ruche-format-admin"

function read(key: string): RegionalFormat | null {
  try {
    const stored = localStorage.getItem(key)
    return isRegionalFormat(stored) ? stored : null
  } catch {
    // Stockage indisponible.
    return null
  }
}

function write(key: string, value: RegionalFormat | null): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Le choix vaut pour cette visite ; il reste enregistré sur le compte ou dans la base.
  }
}

function effectiveFormat(): RegionalFormat {
  return read(MEMBER_KEY) ?? read(ADMIN_KEY) ?? languageFormat(language)
}

/** Pour Intl : le format régional qui s'applique (« fr-FR », « en-GB »). */
export const locale: RegionalFormat = effectiveFormat()

/** Le format choisi par le membre dans Mon compte, rangé sur son compte ; null s'il suit l'admin. */
export function memberFormat(
  metadata: Record<string, unknown> | undefined
): RegionalFormat | null {
  const chosen = metadata?.locale
  return isRegionalFormat(chosen) ? chosen : null
}

function reloadIfChanged(): void {
  if (effectiveFormat() !== locale) window.location.reload()
}

/** Le format du membre (null : celui de l'admin), gardé sur ce navigateur. */
export function applyMemberFormat(next: RegionalFormat | null): void {
  write(MEMBER_KEY, next)
  reloadIfChanged()
}

/** Le format de toute l'admin (null : celui de la langue), gardé sur ce navigateur. */
export function applyAdminFormat(next: RegionalFormat | null): void {
  write(ADMIN_KEY, next)
  reloadIfChanged()
}

/** Le nom d'un format dans la langue de l'admin : « Anglais (Royaume-Uni) », « British English ». */
export function regionalFormatName(format: RegionalFormat): string {
  const name =
    new Intl.DisplayNames([languageFormat(language)], {
      type: "language",
      languageDisplay: "standard",
    }).of(format) ?? format
  return name.charAt(0).toLocaleUpperCase(language) + name.slice(1)
}

// Intl.Locale.getWeekInfo n'est pas encore dans les types de TypeScript.
type WeekInfo = { firstDay: number }
type LocaleWithWeek = Intl.Locale & {
  getWeekInfo?: () => WeekInfo
  weekInfo?: WeekInfo
}

/**
 * Le premier jour de la semaine du format, pour le calendrier (0 : dimanche, 1 : lundi) ; lundi
 * si le navigateur ne le dit pas.
 */
export const weekStartsOn = ((): 0 | 1 | 2 | 3 | 4 | 5 | 6 => {
  const info = new Intl.Locale(locale) as LocaleWithWeek
  const firstDay = (info.getWeekInfo?.() ?? info.weekInfo)?.firstDay ?? 1
  return (firstDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6
})()
