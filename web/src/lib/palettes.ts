import { accentThemes, baseThemes } from "@/lib/generated/palettes-data"
import { readStored, writeStored } from "@/lib/stored-choice"

/**
 * Les couleurs de l'admin que chacun choisit dans Mon compte (ADMIN § 7, « Les couleurs de
 * chacun ») : une couleur de base, qui teinte les gris, et une couleur d'accent, qui colore le
 * bouton principal et l'élément choisi du menu. Les valeurs sont celles des thèmes de shadcn, à une
 * version fixe (lib/generated/palettes-data.ts, npm run palettes:generate). Sans React.
 */

type Vars = Readonly<Record<string, string>>
type Pair = { light: Vars; dark: Vars }

const baseColors = [
  "neutral",
  "stone",
  "zinc",
  "mauve",
  "olive",
  "mist",
  "taupe",
] as const
export type BaseColor = (typeof baseColors)[number]

const accentColors = [
  "none",
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sky",
  "teal",
  "violet",
  "yellow",
] as const
export type AccentColor = (typeof accentColors)[number]

// Tous les jetons de chaque couleur de base, comme shadcn les pose (sauf le rayon et le fond du
// menu, une carte sombre de la base) ; Neutre, la couleur de départ, est celle d'index.css. Les
// valeurs sont tirées des thèmes de shadcn par npm run palettes:generate.
const basePalettes = baseThemes as Record<BaseColor, Pair>

// Ce que chaque accent change (bouton principal, graphiques, élément choisi du menu).
const accentPalettes = accentThemes as Record<
  Exclude<AccentColor, "none">,
  Pair
>

const chartsOf = (vars: Vars) => [1, 2, 3, 4, 5].map((n) => vars[`chart-${n}`])

/**
 * Les couleurs de la carte d'une association (Mon compte) : le gris sombre de la base (celui du
 * menu), le bouton principal (la base, ou l'accent) et les cinq couleurs des graphiques.
 */
function presetSwatch(base: BaseColor, accent: AccentColor) {
  const baseVars = basePalettes[base].light
  const vars = accent === "none" ? baseVars : accentPalettes[accent].light
  return { menu: baseVars.primary, ink: vars.primary, charts: chartsOf(vars) }
}

/**
 * Les règles des pastilles de chaque association, tirées des palettes : une carte porte
 * data-preset, chaque pastille data-swatch (menu, ink, chart-1 à chart-5).
 */
export function swatchCss(): string {
  return palettePresets
    .flatMap(({ id, base, accent }) => {
      const { menu, ink, charts } = presetSwatch(base, accent)
      const rule = (part: string, color: string) =>
        `[data-preset="${id}"] [data-swatch="${part}"] { background-color: ${color}; }`
      return [
        rule("menu", menu),
        rule("ink", ink),
        ...charts.map((color, index) => rule(`chart-${index + 1}`, color)),
      ]
    })
    .join("\n")
}

/**
 * Les palettes toutes prêtes : d'abord le preset d'origine de l'admin (Nova, tout en Neutral :
 * base, thème et graphiques), puis dix palettes d'une base et d'un accent de la même famille de
 * teinte (06/10/2026).
 */
export const palettePresets = [
  { id: "neutral-none", base: "neutral", accent: "none" },
  { id: "stone-orange", base: "stone", accent: "orange" },
  { id: "taupe-amber", base: "taupe", accent: "amber" },
  { id: "olive-green", base: "olive", accent: "green" },
  { id: "mist-teal", base: "mist", accent: "teal" },
  { id: "mist-sky", base: "mist", accent: "sky" },
  { id: "zinc-indigo", base: "zinc", accent: "indigo" },
  { id: "zinc-blue", base: "zinc", accent: "blue" },
  { id: "mauve-violet", base: "mauve", accent: "violet" },
  { id: "mauve-rose", base: "mauve", accent: "rose" },
  { id: "neutral-red", base: "neutral", accent: "red" },
] as const satisfies readonly {
  id: string
  base: BaseColor
  accent: AccentColor
}[]

export type PresetId = (typeof palettePresets)[number]["id"]

/** Les couleurs d'un logo décliné pour une palette (lib/brand-colors.ts), par fond. */
export type LogoColors = Record<
  "light" | "dark",
  { main: string; accent: string }
>

/**
 * Les couleurs d'une palette pour un logo : sur fond clair, la couleur principale prend l'encre de
 * la base (celle des boutons sans accent) et l'accent la couleur des boutons de l'accent ; sur fond
 * sombre, le texte clair de la base et l'accent plus clair du menu sombre. Sans accent : l'encre de
 * la base.
 */
export function presetLogoColors(id: PresetId): LogoColors {
  const preset = palettePresets.find((one) => one.id === id)!
  const base = basePalettes[preset.base]
  const accent = preset.accent === "none" ? base : accentPalettes[preset.accent]
  return {
    light: { main: base.light.primary, accent: accent.light.primary },
    // Sur fond sombre, l'accent plus clair du menu sombre de shadcn (sidebar-primary) : celui des
    // boutons sombres se lirait mal sur un fond presque noir.
    dark: {
      main: base.dark.foreground,
      accent: accent.dark["sidebar-primary"] ?? accent.dark.primary,
    },
  }
}

/** La palette prête à l'emploi qui correspond à ce choix, ou null (une association libre). */
export function presetOf(palette: Palette): PresetId | null {
  return (
    palettePresets.find(
      (one) => one.base === palette.base && one.accent === palette.accent
    )?.id ?? null
  )
}

/** Les couleurs choisies par un membre (sur ce navigateur). */
export type Palette = { base: BaseColor; accent: AccentColor }

export const DEFAULT_PALETTE: Palette = { base: "neutral", accent: "none" }

// La clé du choix, sur le navigateur de chacun (comme le thème clair ou sombre).
export const PALETTE_STORAGE_KEY = "ruche-couleurs"

function isPalette(value: unknown): value is Palette {
  if (typeof value !== "object" || value === null) return false
  const { base, accent } = value as Record<string, unknown>
  return (
    (baseColors as readonly unknown[]).includes(base) &&
    (accentColors as readonly unknown[]).includes(accent)
  )
}

/**
 * Le CSS qui pose ces couleurs par-dessus index.css, comme shadcn : tous les jetons de la base (rien
 * pour Neutre, la couleur de départ), puis ceux de l'accent (couleur principale, secondaire,
 * graphiques, menu) ; en clair (:root) et en sombre (.dark) ; enfin l'élément choisi du menu de
 * gauche, à la couleur des boutons de la page. Vide pour les couleurs de départ.
 */
export function paletteCss(palette: Palette): string {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}
  if (palette.base !== DEFAULT_PALETTE.base) {
    Object.assign(light, basePalettes[palette.base].light)
    Object.assign(dark, basePalettes[palette.base].dark)
  }
  if (palette.accent !== "none") {
    Object.assign(light, accentPalettes[palette.accent].light)
    Object.assign(dark, accentPalettes[palette.accent].dark)
  }
  const block = (selector: string, vars: Record<string, string>) => {
    const lines = Object.entries(vars)
      // sidebar-primary ne sert qu'aux couleurs des logos (presetLogoColors), pas au CSS.
      .filter(([name]) => !name.startsWith("sidebar-primary"))
      .map(([name, value]) => `  --${name}: ${value};`)
    return lines.length > 0 ? `${selector} {\n${lines.join("\n")}\n}` : ""
  }
  // L'élément choisi du menu (toujours sombre) : la couleur des boutons de la page, en clair comme
  // en sombre (--page-primary d'index.css). Plus précis que .dark, que le menu porte aussi.
  const menu: Record<string, string> = {}
  if (palette.accent !== "none") {
    menu["sidebar-active"] = "var(--page-primary)"
    menu["sidebar-active-foreground"] = "var(--page-primary-foreground)"
    // Le lien choisi du header suit l'élément choisi du menu (index.css).
    light["nav-active"] = "var(--page-primary)"
    light["nav-active-foreground"] = "var(--page-primary-foreground)"
  }
  return [
    block(":root", light),
    block(".dark", dark),
    block('.dark[data-slot="sidebar-inner"]', menu),
  ]
    .filter(Boolean)
    .join("\n")
}

/** Le choix gardé sur ce navigateur (les couleurs de départ sinon). */
export function readPalette(): Palette {
  try {
    const stored: unknown = JSON.parse(
      readStored(PALETTE_STORAGE_KEY) ?? "null"
    )
    if (isPalette(stored)) return stored
  } catch {
    // Valeur abîmée : les couleurs de départ.
  }
  return DEFAULT_PALETTE
}

/** Garde le choix sur ce navigateur. */
export function savePalette(palette: Palette) {
  writeStored(PALETTE_STORAGE_KEY, JSON.stringify(palette))
}

const STYLE_ID = "ruche-couleurs"

/** Pose les couleurs sur la page : une balise style, après index.css, qu'elle surcharge. */
export function applyPalette(palette: Palette) {
  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement("style")
    style.id = STYLE_ID
    document.head.append(style)
  }
  style.textContent = paletteCss(palette)
}
