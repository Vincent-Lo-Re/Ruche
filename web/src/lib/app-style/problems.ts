// Ce que vérifie la charte au-delà de sa forme (le validateur généré) : les mêmes règles que
// private.style_problems de la base (références, doublons), et la lisibilité (contrastes WCAG),
// que l'onglet signale sans rien refuser.

import {
  badgeParts,
  colorValue,
  nameKey,
  readOn,
  styleModes,
  TEXT_CONTRAST,
  tintParts,
  type AppStyle,
  type ColorRole,
  type StyleButton,
  type StyleMode,
} from "@/lib/app-style/style"

type ListKey = "colors" | "tints" | "badges" | "buttons" | "fonts"
const lists: readonly ListKey[] = [
  "colors",
  "tints",
  "badges",
  "buttons",
  "fonts",
]

/** Un problème que la base refuserait (charte_invalide), sous la forme de ses faits. */
export type StyleProblem =
  | { rule: "duplicateId"; list: ListKey; id: string }
  | { rule: "duplicateName"; list: ListKey; name: string }
  | { rule: "reference"; at: string }
  | { rule: "shape"; message: string }

/** Les problèmes d'une charte de la bonne forme ; vide si la base l'accepte. */
export function styleProblems(style: AppStyle): StyleProblem[] {
  const problems: StyleProblem[] = []
  for (const list of lists) {
    const items: readonly { id: string; name: string }[] = style[list]
    const ids = new Map<string, number>()
    const names = new Map<string, string[]>()
    for (const item of items) {
      ids.set(item.id, (ids.get(item.id) ?? 0) + 1)
      const key = nameKey(item.name)
      names.set(key, [...(names.get(key) ?? []), item.name])
    }
    for (const [id, count] of ids) {
      if (count > 1) problems.push({ rule: "duplicateId", list, id })
    }
    // Le nom du dernier de la liste : celui qu'on vient d'ajouter, en général.
    for (const same of names.values()) {
      if (same.length > 1)
        problems.push({ rule: "duplicateName", list, name: same.at(-1)! })
    }
  }
  const colors = new Set(style.colors.map((color) => color.id))
  const fonts = new Set(style.fonts.map((font) => font.id))
  for (const [role, id] of Object.entries(style.roles)) {
    if (!colors.has(id))
      problems.push({ rule: "reference", at: `roles.${role}` })
  }
  for (const [role, id] of Object.entries(style.fontRoles)) {
    if (!fonts.has(id))
      problems.push({ rule: "reference", at: `fontRoles.${role}` })
  }
  const checkParts = <T>(
    list: "tints" | "badges" | "buttons",
    items: readonly T[],
    parts: readonly (keyof T & string)[]
  ) =>
    items.forEach((item, position) => {
      for (const part of parts) {
        if (!colors.has(String(item[part])))
          problems.push({
            rule: "reference",
            at: `${list}.${position}.${part}`,
          })
      }
    })
  checkParts("tints", style.tints, tintParts)
  checkParts("badges", style.badges, badgeParts)
  checkParts("buttons", style.buttons, ["fill", "end", "border", "label"])
  return problems
}

/** Le contraste entre deux couleurs « #rrggbb » (WCAG 2), de 1 à 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Où se trouve un texte difficile à lire. */
type IssuePlace =
  | { kind: "role"; role: ColorRole }
  | { kind: "tint"; id: string; part: "title" | "text" | "link" }
  | { kind: "badge"; id: string }
  | { kind: "button"; id: string }

/** Ce qui se lit mal : où, dans quel mode, son contraste et celui qu'il faudrait. */
export type ReadabilityIssue = IssuePlace & {
  mode: StyleMode
  ratio: number
  min: number
}

/** Les fonds sur lesquels se lit le texte d'un bouton (un dégradé : ses deux bouts). */
function buttonGrounds(
  style: AppStyle,
  button: StyleButton,
  mode: StyleMode
): (string | null)[] {
  if (button.kind === "flat") return [colorValue(style, button.fill, mode)]
  if (button.kind === "gradient")
    return [
      colorValue(style, button.fill, mode),
      colorValue(style, button.end, mode),
    ]
  return [colorValue(style, style.roles.background, mode)]
}

/** Les textes difficiles à lire, dans les modes que garde l'app. */
export function readabilityIssues(style: AppStyle): ReadabilityIssue[] {
  const issues: ReadabilityIssue[] = []
  for (const mode of styleModes(style)) {
    const value = (id: string) => colorValue(style, id, mode)
    const check = (
      fore: string | null,
      grounds: (string | null)[],
      min: number,
      where: IssuePlace
    ) => {
      if (fore === null || grounds.some((ground) => ground === null)) return
      const ratio = Math.min(
        ...grounds.map((ground) => contrast(fore, ground!))
      )
      if (ratio < min) issues.push({ ...where, mode, ratio, min })
    }
    for (const [role, rule] of Object.entries(readOn) as [
      ColorRole,
      { on: ColorRole; min: number },
    ][]) {
      check(value(style.roles[role]), [value(style.roles[rule.on])], rule.min, {
        kind: "role",
        role,
      })
    }
    for (const tint of style.tints) {
      for (const part of ["title", "text", "link"] as const) {
        check(value(tint[part]), [value(tint.fill)], TEXT_CONTRAST, {
          kind: "tint",
          id: tint.id,
          part,
        })
      }
    }
    for (const badge of style.badges) {
      check(value(badge.text), [value(badge.fill)], TEXT_CONTRAST, {
        kind: "badge",
        id: badge.id,
      })
    }
    for (const button of style.buttons) {
      check(
        value(button.label),
        buttonGrounds(style, button, mode),
        TEXT_CONTRAST,
        { kind: "button", id: button.id }
      )
    }
  }
  return issues
}
