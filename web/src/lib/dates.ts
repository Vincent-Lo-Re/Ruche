import { locale } from "@/lib/regional-format"
import { timeZone } from "@/lib/time-zone"
import { texts } from "@/texts"

// Toutes les dates de l'administration sont à l'heure de son fuseau (Paramètres › Avancé, Paris
// au départ : lib/time-zone.ts) et s'écrivent dans son format régional (lib/regional-format.ts :
// « 27 sept. 2026 à 14h30 », « Sep 27, 2026, 2:30 PM », « 27 Sept 2026, 14:30 »). C'est le
// navigateur (Intl) qui sait écrire chaque format ; deux règles de la maison s'y ajoutent pour la
// France, que les navigateurs n'écrivent pas tous de même : « 14h30 », et « à » avant l'heure.
// Entre les heures et les minutes, en France : « 14h30 ».
const FRENCH_HOUR_MARK = "h"
// Entre la date et l'heure, en France : « 27 sept. 2026 à 14h30 ».
const FRENCH_AT = " à "

/** Les écritures d'un format régional dans un fuseau, avec les règles maison de la France. */
function writersFor(format: string, zone: string) {
  const french = format === "fr-FR"
  const dateFormat = new Intl.DateTimeFormat(format, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: zone,
  })
  const dateTimeFormat = new Intl.DateTimeFormat(format, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  })
  const timeFormat = new Intl.DateTimeFormat(format, {
    hour: french ? "2-digit" : "numeric",
    minute: "2-digit",
    timeZone: zone,
  })
  // Un format Intl, avec « 14h30 » en France au lieu de « 14:30 ».
  const write = (intl: Intl.DateTimeFormat, value: Date) => {
    const parts = intl.formatToParts(value)
    return parts
      .map((part, index) =>
        french &&
        part.type === "literal" &&
        parts[index - 1]?.type === "hour" &&
        parts[index + 1]?.type === "minute"
          ? FRENCH_HOUR_MARK
          : part.value
      )
      .join("")
  }
  return {
    date: (value: Date) => dateFormat.format(value),
    time: (value: Date) => write(timeFormat, value),
    dateTime: (value: Date) =>
      french
        ? `${dateFormat.format(value)}${FRENCH_AT}${write(timeFormat, value)}`
        : write(dateTimeFormat, value),
  }
}

const writers = writersFor(locale, timeZone)
const frenchHour = locale === "fr-FR"

const dayFormat = new Intl.DateTimeFormat(locale, {
  day: "numeric",
  month: "short",
  timeZone,
})

// L'exemple d'un format régional : le 27 septembre 2026 à 14 h 30, et un nombre.
const SAMPLE = new Date(Date.UTC(2026, 8, 27, 14, 30))

/** « 27 sept. 2026 à 14h30 · 1 234,5 » : un format tel que l'admin l'écrit (sous sa liste). */
export function formatSample(format: string): string {
  const date = writersFor(format, "UTC").dateTime(SAMPLE)
  return `${date} · ${new Intl.NumberFormat(format).format(1234.5)}`
}

/**
 * Une date courte : l'heure seule le jour même (« 16h31 »), sinon le jour (« 3 oct. »). `today`
 * dit lequel.
 */
export function formatShortDateTime(
  date: Date | string,
  now: Date = new Date()
): { today: boolean; text: string } {
  const value = typeof date === "string" ? new Date(date) : date
  const today = toZoneParts(value).date === toZoneParts(now).date
  return {
    today,
    text: today ? writers.time(value) : dayFormat.format(value),
  }
}

/** Le jour seul : « 27 sept. 2026 », « Sep 27, 2026 ». */
export function formatDate(date: Date | string): string {
  return writers.date(typeof date === "string" ? new Date(date) : date)
}

/** « 27 sept. 2026 à 18h42 », « Sep 27, 2026, 6:42 PM », « 27 Sept 2026, 18:42 ». */
export function formatDateTime(date: Date | string): string {
  return writers.dateTime(typeof date === "string" ? new Date(date) : date)
}

// ---------------------------------------------------------------------------------------------
// Saisie d'un jour et d'une heure (fenêtre « Programmer ») : dans l'ordre et avec le séparateur
// du format régional, « 25/10/2099 », « 10/25/2099 », « 25.10.2099 » ; l'heure comme il l'écrit,
// « 08h00 », « 8:00 AM », « 08:00 ». Toute heure bien écrite est comprise, quel que soit le
// format. Les calculs gardent les formats ISO (« 2099-10-25 », « 08:00 »).
// ---------------------------------------------------------------------------------------------

type DayField = "day" | "month" | "year"

// L'ordre des champs du jour et leur séparateur dans le format régional.
const dayLayout = (() => {
  const parts = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(Date.UTC(2099, 9, 25)))
  const order = parts
    .map((part) => part.type)
    .filter((type): type is DayField => ["day", "month", "year"].includes(type))
  const separator =
    parts.find((part) => part.type === "literal")?.value.trim() || "/"
  return { order, separator }
})()

// L'heure du format sur 12 heures (« 8:00 AM ») ou sur 24.
const twelveHours = ["h11", "h12"].includes(
  new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions()
    .hourCycle ?? ""
)

const DAY_INPUT = /^(\d{1,4})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{1,4})$/
// « 8h05 », « 08:05 », « 8 h 05 », « 8h », ou sur 12 heures « 8:00 AM », « 8 pm », « 8 p.m. ».
const TIME_INPUT =
  /^(\d{1,2})(?:\s*[h:.]\s*(\d{2})?)?\s*(?:([ap])\.?\s*m\.?)?$/i

const pad = (value: number) => String(value).padStart(2, "0")

/** Ce qu'on tape dans « Jour » : « jj/mm/aaaa », « mm/dd/yyyy », « tt.mm.jjjj »… */
export const dayInputPlaceholder = dayLayout.order
  .map((field) => texts.dates.fields[field])
  .join(dayLayout.separator)

/** Un exemple d'heure : « 08h00 », « 8:00 AM », « 08:00 ». */
export const timeInputPlaceholder = formatTimeInput("08:00")

/**
 * « 25/10/2099 » (ou « 5/3/2099 », dans l'ordre du format) → « 2099-10-25 ». Null si ce n'est pas
 * un jour qui existe.
 */
export function parseDayInput(text: string): string | null {
  const match = DAY_INPUT.exec(text.trim())
  if (!match) return null
  const values = Object.fromEntries(
    dayLayout.order.map((field, index) => [field, Number(match[index + 1])])
  ) as Record<DayField, number>
  const { day, month, year } = values
  if (year < 1000) return null
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  return `${year}-${pad(month)}-${pad(day)}`
}

/** « 2099-10-25 » → « 25/10/2099 », « 10/25/2099 », « 25.10.2099 » selon le format. */
export function formatDayInput(iso: string): string {
  const [year, month, day] = iso.split("-")
  const values: Record<DayField, string> = { day, month, year }
  return dayLayout.order.map((field) => values[field]).join(dayLayout.separator)
}

/**
 * « 8h05 », « 08:05 », « 8 h », « 8:05 AM », « 8 pm », « 20:05 » → « 08:05 », quel que soit le
 * format. Null sinon.
 */
export function parseTimeInput(text: string): string | null {
  const match = TIME_INPUT.exec(text.trim())
  if (!match) return null
  const [, hourText, minuteText, half] = match
  let hours = Number(hourText)
  const minutes = Number(minuteText ?? "0")
  if (minutes > 59) return null
  if (half) {
    if (hours < 1 || hours > 12) return null
    hours = (hours % 12) + (half.toLowerCase() === "p" ? 12 : 0)
  } else if (hours > 23 || (twelveHours && minuteText === undefined)) {
    // Sur 12 heures, « 8 » seul ne dit pas le matin ou le soir.
    return null
  }
  return `${pad(hours)}:${pad(minutes)}`
}

/** « 08:05 » → « 08h05 », « 8:05 AM », « 08:05 » selon le format. */
export function formatTimeInput(time: string): string {
  const [hours, minutes] = time.split(":")
  if (twelveHours) {
    const hour = Number(hours)
    return `${hour % 12 || 12}:${minutes} ${hour < 12 ? "AM" : "PM"}`
  }
  return `${hours}${frenchHour ? FRENCH_HOUR_MARK : ":"}${minutes}`
}

// ---------------------------------------------------------------------------------------------
// Heure du fuseau de l'admin ↔ instant (timestamptz), pour programmer une publication.
// La base compare l'instant avec now() : seul l'instant compte, pas le fuseau de pg_cron.
// ---------------------------------------------------------------------------------------------

// Les chiffres de la date et de l'heure dans un fuseau, sur 24 heures (jamais « 24:00 »).
const partsFormats = new Map<string, Intl.DateTimeFormat>()
function partsFormat(zone: string): Intl.DateTimeFormat {
  let format = partsFormats.get(zone)
  if (!format) {
    format = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
    partsFormats.set(zone, format)
  }
  return format
}

/** Jour et heure dans le fuseau : { date: "2026-10-25", time: "02:30" } (formats des champs HTML). */
type ZoneParts = { date: string; time: string }

export function toZoneParts(instant: Date, zone: string = timeZone): ZoneParts {
  const parts: Record<string, string> = {}
  for (const part of partsFormat(zone).formatToParts(instant)) {
    parts[part.type] = part.value
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

// Le décalage du fuseau à un instant, en minutes (Paris : 120 en été, 60 en hiver).
function offsetMinutes(instant: Date, zone: string): number {
  const { date, time } = toZoneParts(instant, zone)
  const [year, month, day] = date.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  const asUtc = Date.UTC(year, month - 1, day, hours, minutes)
  return Math.round((asUtc - instant.getTime()) / 60_000)
}

type ZoneInstant =
  // ambiguous : l'heure existe deux fois (retour à l'heure d'hiver, fin octobre) ; c'est la
  // première, encore en heure d'été, qui est retenue.
  | { ok: true; instant: Date; ambiguous: boolean }
  // invalid : jour ou heure mal écrits, ou qui n'existent pas (31 avril) ;
  // nonexistent : l'heure n'existe pas ce jour-là (passage à l'heure d'été, fin mars : on
  // passe de 2 h à 3 h).
  | { ok: false; reason: "invalid" | "nonexistent" }

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/
const DAY_MS = 24 * 60 * 60_000

/**
 * L'instant qui correspond à un jour et une heure du fuseau (« 2026-10-03 », « 08:00 »). Aux
 * changements d'heure, une heure peut ne pas exister ou exister deux fois : on le dit.
 */
export function zoneToInstant(
  date: string,
  time: string,
  zone: string = timeZone
): ZoneInstant {
  const day = DATE_PATTERN.exec(date)
  const clock = TIME_PATTERN.exec(time)
  if (!day || !clock) return { ok: false, reason: "invalid" }
  const [year, month, dayOfMonth] = day.slice(1).map(Number)
  const [hours, minutes] = clock.slice(1).map(Number)
  if (hours > 23 || minutes > 59) return { ok: false, reason: "invalid" }
  // Le même jour et la même heure « comme si » le fuseau était à UTC.
  const naive = Date.UTC(year, month - 1, dayOfMonth, hours, minutes)
  const check = new Date(naive)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== dayOfMonth
  ) {
    return { ok: false, reason: "invalid" }
  }
  // Les décalages possibles : ceux du fuseau la veille et le lendemain (un changement d'heure,
  // s'il y en a un, tombe entre les deux), le plus grand d'abord.
  const offsets = [
    ...new Set([
      offsetMinutes(new Date(naive - DAY_MS), zone),
      offsetMinutes(new Date(naive + DAY_MS), zone),
    ]),
  ].sort((a, b) => b - a)
  // Les instants qui, lus dans le fuseau, redonnent exactement ce jour et cette heure (le plus
  // tôt d'abord : heure d'été avant heure d'hiver).
  const matches = offsets
    .map((offset) => new Date(naive - offset * 60_000))
    .filter((instant) => {
      const parts = toZoneParts(instant, zone)
      return parts.date === date && parts.time === time
    })
  if (matches.length === 0) return { ok: false, reason: "nonexistent" }
  return { ok: true, instant: matches[0], ambiguous: matches.length > 1 }
}
