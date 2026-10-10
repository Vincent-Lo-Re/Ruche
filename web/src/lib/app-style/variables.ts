// La charte en variables CSS : ce que l'aperçu (et, plus tard, le téléphone de l'éditeur) pose
// sur le téléphone pour l'habiller dans un mode. Les mêmes valeurs que lira l'app.

import { fontStack } from "@/lib/app-style/fonts"
import {
  colorRoleGroups,
  colorValue,
  fontRoles,
  sizeRoles,
  type AppStyle,
  type ColorRole,
  type StyleMode,
} from "@/lib/app-style/style"

// L'ombre des cartes : sa forme, et son opacité en clair et en sombre (noire en sombre).
const shadows = {
  light: { shape: "0 2px 8px", alpha: { light: 0.08, dark: 0.3 } },
  medium: { shape: "0 4px 14px", alpha: { light: 0.14, dark: 0.4 } },
  strong: { shape: "0 6px 16px", alpha: { light: 0.3, dark: 0.55 } },
} as const

const kebab = (key: string) =>
  key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/** Les variables CSS d'une charte dans un mode : --style-<usage>, --style-font-<usage>… */
export function styleVariables(
  style: AppStyle,
  mode: StyleMode
): Record<string, string> {
  const vars: Record<string, string> = {}
  const roles: ColorRole[] = colorRoleGroups.flatMap((group) => [
    ...group.roles,
  ])
  for (const role of roles) {
    vars[`--style-${kebab(role)}`] =
      colorValue(style, style.roles[role], mode) ?? "transparent"
  }
  for (const role of fontRoles) {
    const font =
      style.fonts.find((f) => f.id === style.fontRoles[role]) ?? style.fonts[0]
    vars[`--style-font-${kebab(role)}`] = fontStack(font)
    vars[`--style-weight-${kebab(role)}`] = String(font.weight)
  }
  for (const role of sizeRoles) {
    vars[`--style-size-${role}`] = `${style.sizes[role].size}px`
    vars[`--style-line-${role}`] = String(style.sizes[role].lineHeight)
  }
  vars["--style-radius"] = `${style.radius}px`
  vars["--style-image-radius"] = `${style.imageRadius}px`
  vars["--style-link-decoration"] = style.underlineLinks ? "underline" : "none"
  vars["--style-link-weight"] = style.underlineLinks ? "inherit" : "600"
  if (style.shadow === "none") {
    vars["--style-shadow"] = "none"
  } else {
    const { shape, alpha } = shadows[style.shadow]
    const tint = mode === "dark" ? "0 0 0" : "24 24 27"
    vars["--style-shadow"] = `${shape} rgb(${tint} / ${alpha[mode]})`
  }
  return vars
}

/** Les couleurs d'un élément (teinte, pastille, bouton) en variables, pour l'aperçu. */
export function partVariables(
  style: AppStyle,
  mode: StyleMode,
  parts: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(parts).map(([part, id]) => [
      `--part-${part}`,
      colorValue(style, id, mode) ?? "transparent",
    ])
  )
}

/** Les couleurs d'une teinte d'encadré (absente, ou disparue de la charte : la première). */
export function tintVariables(
  style: AppStyle,
  mode: StyleMode,
  tintId?: string
): Record<string, string> {
  const tint = style.tints.find((t) => t.id === tintId) ?? style.tints[0]
  const value = (id: string) => colorValue(style, id, mode) ?? "transparent"
  return {
    "--blocks-tint-fill": value(tint.fill),
    "--blocks-tint-border": value(tint.border),
    "--blocks-tint-title": value(tint.title),
    "--blocks-tint-text": value(tint.text),
    "--blocks-tint-link": value(tint.link),
  }
}

/**
 * La charte en variables du téléphone de l'éditeur (preview.css, --blocks-*) : couleurs, polices,
 * tailles, arrondis et liens, et la première teinte pour les encadrés. Les espacements restent
 * ceux de blocks.tokens.json.
 */
export function blocksVariables(
  style: AppStyle,
  mode: StyleMode
): Record<string, string> {
  const color = (role: ColorRole) =>
    colorValue(style, style.roles[role], mode) ?? "transparent"
  const font = (role: (typeof fontRoles)[number]) =>
    style.fonts.find((f) => f.id === style.fontRoles[role]) ?? style.fonts[0]
  const { title, heading, body, small } = style.sizes
  // L'intertitre de niveau 3, entre l'intertitre et le texte courant (la charte n'en a qu'un).
  const subheading = Math.round((heading.size + body.size) / 2)
  const firstTint = tintVariables(style, mode)
  return {
    "--blocks-color-background": color("background"),
    "--blocks-color-text": color("text"),
    "--blocks-color-text-muted": color("muted"),
    "--blocks-color-link": color("link"),
    "--blocks-color-box-fill": firstTint["--blocks-tint-fill"],
    "--blocks-color-box-border": firstTint["--blocks-tint-border"],
    "--blocks-color-image-placeholder": color("card"),
    "--blocks-font-family": fontStack(font("body")),
    "--blocks-font-regular-weight": String(font("body").weight),
    "--blocks-font-title-family": fontStack(font("title")),
    "--blocks-font-title-weight": String(font("title").weight),
    "--blocks-font-heading-family": fontStack(font("heading")),
    "--blocks-font-heading-weight": String(font("heading").weight),
    "--blocks-font-caption-family": fontStack(font("small")),
    "--blocks-font-title-size": `${title.size}px`,
    "--blocks-font-title-line-height": String(title.lineHeight),
    "--blocks-font-h2-size": `${heading.size}px`,
    "--blocks-font-h2-line-height": String(heading.lineHeight),
    "--blocks-font-h3-size": `${subheading}px`,
    "--blocks-font-h3-line-height": String(heading.lineHeight),
    "--blocks-font-body-size": `${body.size}px`,
    "--blocks-font-body-line-height": String(body.lineHeight),
    "--blocks-font-caption-size": `${small.size}px`,
    "--blocks-font-caption-line-height": String(small.lineHeight),
    "--blocks-radius-box": `${style.radius}px`,
    "--blocks-radius-image": `${style.imageRadius}px`,
    "--blocks-link-decoration": style.underlineLinks ? "underline" : "none",
    ...firstTint,
  }
}
