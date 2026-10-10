import { readStored, writeStored } from "@/lib/stored-choice"

// Le fuseau horaire de l'admin (Paramètres › Avancé), choisi une fois au chargement comme la
// langue : les dates s'affichent à son heure, et l'heure d'une publication programmée s'y comprend.
// Il est gardé sur ce navigateur pour être connu dès le chargement ; s'il change, la page se
// recharge. Paris au départ.

export const DEFAULT_TIME_ZONE = "Europe/Paris"

const KEY = "ruche-fuseau"

/** Un fuseau que le navigateur connaît (nom IANA, « Europe/Paris »). */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value === "") return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

const stored = readStored(KEY)
export const timeZone: string =
  stored !== null && isTimeZone(stored) ? stored : DEFAULT_TIME_ZONE

/** Le fuseau de toute l'admin, gardé sur ce navigateur ; la page se recharge s'il a changé. */
export function applyAdminTimeZone(next: string): void {
  // Sans stockage, le fuseau vaut pour cette visite ; il reste enregistré dans la base.
  writeStored(KEY, next)
  if (next !== timeZone) window.location.reload()
}

/** Tous les fuseaux que le navigateur connaît, le fuseau donné compris. */
export function timeZoneNames(current: string): string[] {
  const names = Intl.supportedValuesOf("timeZone")
  return names.includes(current) ? names : [current, ...names].sort()
}

/** La ville d'un fuseau : « Paris », « New York » (« UTC » pour UTC). */
export function timeZoneCity(zone: string): string {
  return (zone.split("/").at(-1) ?? zone).replaceAll("_", " ")
}

/** Le décalage d'un fuseau à un instant : « UTC+02:00 », « UTC−05:00 », « UTC ». */
export function timeZoneOffset(zone: string, at: Date = new Date()): string {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "longOffset",
  })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value
  // « GMT » ou « GMT+00:00 » selon le navigateur : UTC.
  if (!name || /^GMT([+-]00:00)?$/.test(name)) return "UTC"
  return name.replace("GMT", "UTC").replace("-", "−")
}
