// La charte graphique de l'app (ADMIN § 1, section « App », onglet « Charte graphique ») : sa
// forme est la variante « style » de blocks/blocks.schema.json ; ici, ses usages, sa charte
// neutre et ce qui s'ajoute ou se retire, sans React.

import type {
  AppStyle,
  StyleBadge,
  StyleButton,
  StyleColor,
  StyleColorRoles,
  StyleFont,
  StyleFontRoles,
  StyleSizes,
  StyleTint,
} from "@/blocks/generated/blocks"

export type {
  AppStyle,
  StyleBadge,
  StyleButton,
  StyleColor,
  StyleFont,
  StyleTint,
}

export type ColorRole = keyof StyleColorRoles
export type FontRole = keyof StyleFontRoles
export type SizeRole = keyof StyleSizes
export type StyleMode = "light" | "dark"
export type ButtonKind = StyleButton["kind"]

/** Les usages des couleurs, rangés en groupes comme dans l'onglet. */
export const colorRoleGroups = [
  { group: "screen", roles: ["background", "card", "border"] },
  { group: "text", roles: ["text", "muted", "link", "primary"] },
  {
    group: "bars",
    roles: ["topBar", "topBarText", "tabBar", "tabOn", "tabOff"],
  },
  { group: "fields", roles: ["focus"] },
  { group: "states", roles: ["success", "warning", "error"] },
] as const satisfies readonly { group: string; roles: readonly ColorRole[] }[]

/** Contraste minimal (WCAG 2) : un texte, et une bordure qui doit se voir. */
export const TEXT_CONTRAST = 4.5
const BORDER_CONTRAST = 3

/** Les usages qui se lisent sur un autre, et le contraste qu'il leur faut. */
export const readOn: Partial<
  Record<ColorRole, { on: ColorRole; min: number }>
> = {
  text: { on: "background", min: TEXT_CONTRAST },
  muted: { on: "background", min: TEXT_CONTRAST },
  link: { on: "background", min: TEXT_CONTRAST },
  topBarText: { on: "topBar", min: TEXT_CONTRAST },
  tabOn: { on: "tabBar", min: TEXT_CONTRAST },
  tabOff: { on: "tabBar", min: TEXT_CONTRAST },
  focus: { on: "card", min: BORDER_CONTRAST },
  success: { on: "background", min: TEXT_CONTRAST },
  warning: { on: "background", min: TEXT_CONTRAST },
  error: { on: "background", min: TEXT_CONTRAST },
}

export const fontRoles = [
  "brand",
  "title",
  "heading",
  "body",
  "quote",
  "small",
  "boxTitle",
  "button",
  "tabs",
] as const satisfies readonly FontRole[]

export const sizeRoles = [
  "title",
  "heading",
  "body",
  "quote",
  "small",
] as const satisfies readonly SizeRole[]

/** Les bornes du schéma (variante « style »), pour les champs de l'onglet. */
export const MIN_FONTS = 3
export const MAX_COLORS = 60
export const MAX_ITEMS = 30
export const MAX_FONTS = 12
export const MAX_NAME = 40
export const SIZE_RANGE = { min: 10, max: 48 } as const
export const LINE_HEIGHT_RANGE = { min: 1, max: 2, step: 0.05 } as const
export const RADIUS_RANGE = { min: 0, max: 24 } as const

/** Les couleurs d'une teinte, d'une pastille et de chaque style de bouton. */
export const tintParts = [
  "fill",
  "border",
  "title",
  "text",
  "link",
] as const satisfies readonly (keyof StyleTint)[]
export const badgeParts = [
  "fill",
  "border",
  "text",
] as const satisfies readonly (keyof StyleBadge)[]
export const buttonKinds = [
  "flat",
  "gradient",
  "outline",
  "text",
] as const satisfies readonly ButtonKind[]
export type ButtonPart = "fill" | "end" | "border" | "label"
export const buttonParts: Record<ButtonKind, readonly ButtonPart[]> = {
  flat: ["fill", "label"],
  gradient: ["fill", "end", "label"],
  outline: ["border", "label"],
  text: ["label"],
}

/** Les modes que l'app montre : les deux, ou celui qu'elle garde toujours. */
export function styleModes(style: AppStyle): StyleMode[] {
  return style.darkMode === "auto" ? ["light", "dark"] : [style.darkMode]
}

/** La valeur d'une couleur de la palette dans un mode (absente : null). */
export function colorValue(
  style: AppStyle,
  id: string,
  mode: StyleMode
): string | null {
  return style.colors.find((color) => color.id === id)?.[mode] ?? null
}

/** Vrai si une couleur sert quelque part : elle ne se supprime pas. */
export function colorInUse(style: AppStyle, id: string): boolean {
  return (
    Object.values(style.roles).includes(id) ||
    style.tints.some((tint) => tintParts.some((part) => tint[part] === id)) ||
    style.badges.some((badge) =>
      badgeParts.some((part) => badge[part] === id)
    ) ||
    style.buttons.some((button) =>
      (["fill", "end", "border", "label"] as const).some(
        (part) => button[part] === id
      )
    )
  )
}

/** Vrai si une police sert à un usage : elle ne se supprime pas. */
export function fontInUse(style: AppStyle, id: string): boolean {
  return Object.values(style.fontRoles).includes(id)
}

/** Les noms de la charte neutre, dans la langue de l'admin (texts.appStyle.neutral). */
export type NeutralNames = {
  colors: Record<NeutralColor, string>
  tint: string
  badge: string
  buttons: Record<"primary" | "secondary" | "subtle", string>
  fonts: Record<"headings" | "text" | "accent", string>
}
type NeutralColor =
  | "white"
  | "lightGray"
  | "borderGray"
  | "textGray"
  | "black"
  | "green"
  | "orange"
  | "red"

// Des identifiants fixes : la charte neutre est la même partout (et le cas partagé
// blocks/cases/accepte-charte-neutre.json, vérifié par la base, est elle en anglais).
const fixedId = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`

/**
 * La charte neutre de Ruche (noir, blanc, gris, la police du téléphone) : le point de départ de
 * chaque installation, et celle de l'app tant que rien n'est publié.
 */
export function neutralStyle(names: NeutralNames): AppStyle {
  const values: [NeutralColor, string, string][] = [
    ["white", "#ffffff", "#121214"],
    ["lightGray", "#f4f4f5", "#1f1f23"],
    ["borderGray", "#e4e4e7", "#3a3a3f"],
    ["textGray", "#6b6b72", "#a1a1aa"],
    ["black", "#18181b", "#f4f4f5"],
    ["green", "#15803d", "#4ade80"],
    ["orange", "#b45309", "#fbbf24"],
    ["red", "#b42318", "#f97066"],
  ]
  const id = Object.fromEntries(
    values.map(([key], index) => [key, fixedId(0x100 + index)])
  ) as Record<NeutralColor, string>
  const font = {
    headings: fixedId(0x200),
    text: fixedId(0x201),
    accent: fixedId(0x202),
  }
  const button = (
    n: number,
    name: string,
    kind: ButtonKind,
    label: string
  ): StyleButton => ({
    id: fixedId(n),
    name,
    kind,
    shape: "rounded",
    fill: id.black,
    end: id.textGray,
    border: id.black,
    label,
  })
  return {
    v: 1,
    darkMode: "auto",
    colors: values.map(([key, light, dark]) => ({
      id: id[key],
      name: names.colors[key],
      light,
      dark,
    })),
    roles: {
      background: id.white,
      card: id.lightGray,
      border: id.borderGray,
      text: id.black,
      muted: id.textGray,
      link: id.black,
      primary: id.black,
      topBar: id.white,
      topBarText: id.black,
      tabBar: id.white,
      tabOn: id.black,
      tabOff: id.textGray,
      focus: id.black,
      success: id.green,
      warning: id.orange,
      error: id.red,
    },
    tints: [
      {
        id: fixedId(0x300),
        name: names.tint,
        fill: id.lightGray,
        border: id.borderGray,
        title: id.black,
        text: id.black,
        link: id.black,
      },
    ],
    badges: [
      {
        id: fixedId(0x400),
        name: names.badge,
        fill: id.white,
        border: id.borderGray,
        text: id.black,
      },
    ],
    buttons: [
      button(0x500, names.buttons.primary, "flat", id.white),
      button(0x501, names.buttons.secondary, "outline", id.black),
      button(0x502, names.buttons.subtle, "text", id.black),
    ],
    fields: "outline",
    fonts: [
      {
        id: font.headings,
        name: names.fonts.headings,
        family: "system",
        weight: 700,
      },
      { id: font.text, name: names.fonts.text, family: "system", weight: 400 },
      {
        id: font.accent,
        name: names.fonts.accent,
        family: "system",
        weight: 600,
      },
    ],
    fontRoles: {
      brand: font.headings,
      title: font.headings,
      heading: font.headings,
      body: font.text,
      quote: font.text,
      small: font.text,
      boxTitle: font.accent,
      button: font.accent,
      tabs: font.accent,
    },
    sizes: {
      title: { size: 28, lineHeight: 1.2 },
      heading: { size: 22, lineHeight: 1.25 },
      body: { size: 17, lineHeight: 1.5 },
      quote: { size: 19, lineHeight: 1.4 },
      small: { size: 14, lineHeight: 1.4 },
    },
    radius: 12,
    imageRadius: 12,
    shadow: "none",
    underlineLinks: true,
  }
}

/** Un nom libre dans une liste : « Nouvelle couleur », puis « Nouvelle couleur 2 »… */
export function freeName(
  base: string,
  items: readonly { name: string }[]
): string {
  const taken = new Set(items.map((item) => nameKey(item.name)))
  if (!taken.has(nameKey(base))) return base
  for (let n = 2; ; n++) {
    const name = `${base} ${n}`
    if (!taken.has(nameKey(name))) return name
  }
}

/**
 * La clé d'un nom pour repérer les doublons, comme private.title_key de la base : forme
 * Unicode composée, espaces aux bords retirés et réduits à un, minuscules.
 */
export function nameKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase()
}

const newId = () => crypto.randomUUID()

/** Une couleur ajoutée : un gris moyen, en clair comme en sombre. */
export function newColor(name: string): StyleColor {
  return { id: newId(), name, light: "#888888", dark: "#888888" }
}

/** Une teinte ajoutée : les couleurs des cartes et du texte de la charte. */
export function newTint(style: AppStyle, name: string): StyleTint {
  const { card, border, text, link } = style.roles
  return {
    id: newId(),
    name,
    fill: card,
    border,
    title: text,
    text,
    link,
  }
}

/** Une pastille ajoutée : comme une carte. */
export function newBadge(style: AppStyle, name: string): StyleBadge {
  const { card, border, text } = style.roles
  return { id: newId(), name, fill: card, border, text }
}

/** Un bouton ajouté : une bordure de la couleur principale. */
export function newButton(style: AppStyle, name: string): StyleButton {
  const { primary, background } = style.roles
  return {
    id: newId(),
    name,
    kind: "outline",
    shape: "rounded",
    fill: primary,
    end: primary,
    border: primary,
    label: primary === background ? style.roles.text : primary,
  }
}

/** Une police ajoutée : celle du téléphone. */
export function newFont(name: string): StyleFont {
  return { id: newId(), name, family: "system", weight: 400 }
}

/**
 * Vrai si deux chartes sont les mêmes, quel que soit l'ordre de leurs clés (la base rend les
 * siennes dans son propre ordre).
 */
export function sameStyle(a: AppStyle | null, b: AppStyle | null): boolean {
  return canonical(a) === canonical(b)
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`
      )
      .join(",")}}`
  return JSON.stringify(value)
}
