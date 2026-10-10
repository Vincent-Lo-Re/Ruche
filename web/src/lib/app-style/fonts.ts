// Les polices de la charte (QCM du 10/10/2026, « copiées chez le client ») : celle du téléphone,
// ou une police libre que l'admin sert elle-même (public/fonts/, tirées une fois de Google Fonts
// par scripts/fonts-fetch.mjs) et copie dans l'espace « polices » de l'installation avant de
// publier ; l'app les y lit. Ni l'admin ni l'app n'appellent Google.

import available from "../../../public/fonts/fonts.json"

import type { AppStyle, StyleFont } from "@/lib/app-style/style"

export type FontFamily = StyleFont["family"]
export type FontWeight = StyleFont["weight"]

/** La police du téléphone : rien à copier. */
export const SYSTEM_FAMILY = "system"

/** Les épaisseurs de chaque famille (celle du téléphone les a toutes). */
const weightsByFamily: Record<string, readonly number[]> = available

/** Les familles proposées, la police du téléphone d'abord. */
export const fontFamilies: FontFamily[] = [
  SYSTEM_FAMILY,
  ...(Object.keys(weightsByFamily) as FontFamily[]),
]

const ALL_WEIGHTS: readonly FontWeight[] = [400, 500, 600, 700]

/** Les épaisseurs qu'une famille propose. */
export function weightsOf(family: FontFamily): FontWeight[] {
  if (family === SYSTEM_FAMILY) return [...ALL_WEIGHTS]
  return ALL_WEIGHTS.filter((weight) =>
    weightsByFamily[family]?.includes(weight)
  )
}

/** L'épaisseur la plus proche qu'a une famille (en changeant de famille). */
export function closestWeight(
  family: FontFamily,
  weight: FontWeight
): FontWeight {
  const weights = weightsOf(family)
  if (weights.includes(weight)) return weight
  return weights.reduce((best, next) =>
    Math.abs(next - weight) < Math.abs(best - weight) ? next : best
  )
}

/** Le dossier d'une famille : « Source Serif 4 » → « source-serif-4 » (private.font_folder). */
export function fontFolder(family: string): string {
  return family.toLowerCase().replaceAll(" ", "-")
}

/** Le chemin d'une police, dans public/fonts/ comme dans l'espace « polices ». */
export function fontPath(family: string, weight: number): string {
  return `${fontFolder(family)}/${weight}.ttf`
}

/** Les polices à copier d'une charte (sans celle du téléphone), sans doublon. */
export function fontFiles(
  style: AppStyle
): { family: string; weight: number }[] {
  const seen = new Map<string, { family: string; weight: number }>()
  for (const font of style.fonts) {
    if (font.family === SYSTEM_FAMILY) continue
    seen.set(fontPath(font.family, font.weight), {
      family: font.family,
      weight: font.weight,
    })
  }
  return [...seen.values()]
}

/** Le nom CSS d'une police chargée par l'aperçu : « ruche-inter-700 ». */
function fontFaceName(family: string, weight: number): string {
  return `ruche-${fontFolder(family)}-${weight}`
}

/** La pile CSS d'une police de la charte, pour l'aperçu. */
export function fontStack(font: Pick<StyleFont, "family" | "weight">): string {
  return font.family === SYSTEM_FAMILY
    ? "-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif"
    : `"${fontFaceName(font.family, font.weight)}", system-ui, sans-serif`
}

/** Les @font-face des polices d'une charte, servies par l'admin (public/fonts/). */
export function fontFaces(
  fonts: readonly Pick<StyleFont, "family" | "weight">[]
) {
  const faces = new Map<string, string>()
  for (const font of fonts) {
    if (font.family === SYSTEM_FAMILY) continue
    const name = fontFaceName(font.family, font.weight)
    faces.set(
      name,
      `@font-face { font-family: "${name}"; src: url("/fonts/${fontPath(font.family, font.weight)}") format("truetype"); font-display: swap; }`
    )
  }
  return [...faces.values()].join("\n")
}
