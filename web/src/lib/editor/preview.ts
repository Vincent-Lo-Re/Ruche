import { readChoice, writeChoice, type Choice } from "@/lib/address"

/**
 * L'aperçu de l'éditeur des contenus (docs/ADMINISTRATION.md, § 4) : le téléphone montré, Édition ou
 * Lecture, Clair ou Sombre, Grand texte, et en Lecture, le lecteur imité. Sans React.
 */

export const devices = ["ios", "android"] as const
type Device = (typeof devices)[number]

export const previewModes = ["edit", "read"] as const
type PreviewMode = (typeof previewModes)[number]

export const previewThemes = ["light", "dark"] as const
type PreviewTheme = (typeof previewThemes)[number]

// Un abonné à la bonne formule, ou une personne sans elle.
export const previewReaders = ["subscriber", "visitor"] as const
type PreviewReader = (typeof previewReaders)[number]

export type PreviewSettings = {
  device: Device
  mode: PreviewMode
  theme: PreviewTheme
  largeText: boolean
  reader: PreviewReader
}

// À l'ouverture de l'éditeur depuis une liste : l'iPhone, en Édition, en clair, comme un abonné.
export const defaultPreview: PreviewSettings = {
  device: "ios",
  mode: "edit",
  theme: "light",
  largeText: false,
  reader: "subscriber",
}

// Les réglages gardés dans l'adresse de l'éditeur, d'un écran à l'autre (QCM du 04/10/2026) :
// seulement ceux qui diffèrent de defaultPreview, en mots anglais courants comme les adresses de
// navigation.ts (« ?mode=read&device=android&theme=dark »), chaque mot étant la valeur elle-même.
function choice<T extends string>(
  name: string,
  values: readonly T[],
  fallback: T
): Choice<T> {
  const words = {} as Record<T, string>
  for (const value of values) words[value] = value
  return { name, words, fallback }
}
const searchChoices = {
  mode: choice("mode", previewModes, defaultPreview.mode),
  device: choice("device", devices, defaultPreview.device),
  theme: choice("theme", previewThemes, defaultPreview.theme),
  reader: choice("reader", previewReaders, defaultPreview.reader),
}
const largeTextWord = { name: "text", value: "large" }

/** Les réglages du téléphone lus dans l'adresse ; un mot inconnu vaut le réglage de départ. */
export function previewFromSearch(
  search: string | URLSearchParams
): PreviewSettings {
  const params = new URLSearchParams(search)
  return {
    device: readChoice(params, searchChoices.device),
    mode: readChoice(params, searchChoices.mode),
    theme: readChoice(params, searchChoices.theme),
    largeText: params.get(largeTextWord.name) === largeTextWord.value,
    reader: readChoice(params, searchChoices.reader),
  }
}

/**
 * L'adresse avec ces réglages du téléphone, les autres paramètres gardés ; seuls les réglages
 * qui diffèrent de defaultPreview y sont écrits.
 */
export function withPreview(
  search: string | URLSearchParams,
  preview: PreviewSettings
): URLSearchParams {
  const params = new URLSearchParams(search)
  writeChoice(params, searchChoices.mode, preview.mode)
  writeChoice(params, searchChoices.device, preview.device)
  writeChoice(params, searchChoices.theme, preview.theme)
  writeChoice(params, searchChoices.reader, preview.reader)
  // L'ancien choix « Ajuster / Écran entier » (retiré le 10/10/2026) ne reste pas dans l'adresse.
  params.delete("fit")
  if (preview.largeText) params.set(largeTextWord.name, largeTextWord.value)
  else params.delete(largeTextWord.name)
  return params
}

// En dessous, le texte ne se lirait plus : l'écran déborde plutôt que de rapetisser encore.
const MIN_SCALE = 0.4

/**
 * Le téléphone est toujours montré en entier, en Édition comme en Lecture (10/10/2026,
 * docs/ADMINISTRATION.md, § 4) : sa réduction pour tenir dans la hauteur disponible, 1 si la place suffit,
 * arrondie au centième inférieur, jamais sous 0,4. deviceHeight : la hauteur du téléphone entier,
 * lue dans les variables de preview.css (deviceHeightOf).
 */
export function phoneScale(deviceHeight: number, available: number): number {
  const scale = Math.floor((available / deviceHeight) * 100) / 100
  return Math.min(1, Math.max(MIN_SCALE, scale))
}

/**
 * La valeur choisie dans un groupe de boutons (`ToggleGroup` rend une liste) : `null` quand on
 * reclique sur le bouton déjà choisi, qui reste alors choisi.
 */
export function chosenValue<T extends string>(
  values: readonly T[],
  value: readonly string[]
): T | null {
  return values.find((candidate) => candidate === value[0]) ?? null
}

/**
 * En Lecture, comme une personne sans la formule : l'article réservé ne montre pas ses blocs.
 * C'est ce que l'app reçoit (`app_content` : `locked`, sans `blocks`). Un article dont le
 * niveau n'est pas encore choisi se lit en entier.
 */
export function previewLocked(
  preview: PreviewSettings,
  access: { accessChosen: boolean; accessLevelId: string | null }
): boolean {
  return (
    preview.mode === "read" &&
    preview.reader === "visitor" &&
    access.accessChosen &&
    access.accessLevelId !== null
  )
}

/** Lit les variables en pixels d'un élément (preview.css). */
function pixelsOf(element: Element) {
  const style = getComputedStyle(element)
  return (name: string) => parseFloat(style.getPropertyValue(name)) || 0
}

/**
 * La hauteur du téléphone entier, d'après les variables de l'élément (preview.css,
 * .blocks-preview-layout[data-device]) : l'écran et deux fois le cadre.
 */
export function deviceHeightOf(element: Element): number {
  const px = pixelsOf(element)
  return px("--blocks-screen-height") + 2 * px("--blocks-device-padding")
}

/** La largeur du téléphone entier, de même : l'écran et deux fois le cadre. */
export function deviceWidthOf(element: Element): number {
  const px = pixelsOf(element)
  return px("--blocks-phone-width") + 2 * px("--blocks-device-padding")
}
