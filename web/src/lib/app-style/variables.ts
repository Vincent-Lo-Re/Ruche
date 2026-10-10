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
