// Le monogramme animé de l'écran de connexion (ADMIN § 2, « Les pages de connexion sur le modèle « login-04 » de shadcn ») : les
// animations cochées par un admin (Paramètres, section « Écran de connexion ») s'enchaînent dans
// un ordre fixe, séparées par des pauses. Un SVG aux couleurs modifiables (lib/brand-colors.ts)
// est préparé pour être montré en ligne, ses formes marquées pour le CSS (index.css, data-motion) ;
// un autre fichier (PNG, WebP, SVG non modifiable) ne joue que les animations de tout le
// monogramme. Sans React.

import { analyzeSvgColors, normalizeColor } from "@/lib/brand-colors"
import { cleanSvg } from "@/lib/media/svg"

/**
 * Les animations, dans l'ordre où elles se jouent : le tracé, la cascade, la lueur de l'accent,
 * le reflet, le halo, le balancement, la respiration (colonne login_monogram_motions).
 */
export const MOTIONS = [
  "trace",
  "cascade",
  "glint",
  "shine",
  "halo",
  "sway",
  "breathe",
] as const

export type Motion = (typeof MOTIONS)[number]

/** Celles qui animent les formes une à une : il leur faut un SVG compatible. */
const SVG_MOTIONS: readonly Motion[] = ["trace", "cascade", "glint"]

/** Le départ : aucune animation cochée (c'est un admin qui les choisit, décidé le 09/10/2026). */
export const DEFAULT_MOTIONS: Motion[] = []

export const isMotion = (value: string): value is Motion =>
  (MOTIONS as readonly string[]).includes(value)

/** Une étape de la boucle : une animation, ou une pause. */
export type MotionPhase = Motion | "rest"

/** La durée de chaque animation (index.css) et des pauses, en millisecondes. */
const PHASE_MS: Record<MotionPhase, number> = {
  trace: 3_200,
  cascade: 2_400,
  glint: 2_000,
  shine: 1_600,
  halo: 2_400,
  sway: 3_000,
  breathe: 3_200,
  rest: 4_000,
}

const SHAPES = "path, rect, circle, ellipse, line, polyline, polygon, text"

/** Un SVG prêt à animer : son texte nettoyé et marqué, et ce qu'il sait faire. */
export type AnimatedSvg = { markup: string; glint: boolean }

/** La couleur d'une propriété (fill, stroke) d'une forme, héritée de ses parents. */
function paintOf(element: Element, property: "fill" | "stroke"): string | null {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = node.getAttribute("style") ?? ""
    const inline = new RegExp(
      `(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`,
      "i"
    ).exec(style)
    const value = inline?.[1] ?? node.getAttribute(property)
    if (value) return value.trim().toLowerCase()
  }
  return null
}

const painted = (value: string | null) =>
  value !== null && value !== "none" && value !== "transparent"

/** Le tracé dure 2 secondes, partagé entre les traits selon leur longueur (penTiming). */
const DRAW_MS = 2_000

/** La taille du dessin (viewBox, sinon largeur et hauteur), pour l'épaisseur du trait. */
function drawingSize(svg: Element): number | null {
  const box = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number)
  const [width, height] =
    box.length === 4
      ? [box[2], box[3]]
      : [Number(svg.getAttribute("width")), Number(svg.getAttribute("height"))]
  const size = Math.max(width, height)
  return Number.isFinite(size) && size > 0 ? size : null
}

/**
 * Prépare un SVG pour l'animation, s'il est compatible (couleurs modifiables) ; null sinon. Le
 * tracé dessine le monogramme d'une plume régulière, dans l'ordre du fichier : un contour se dessine
 * (data-motion="trace") ; une forme pleine (data-motion="fill") reçoit une copie qui en trace le
 * bord à sa couleur (data-motion="pen"), puis elle se remplit et le
 * trait s'efface ; un texte apparaît (data-motion="reveal"). Ce qui se trace porte data-pen
 * (pathLength 1, durée posée par penTiming). Les formes de la couleur d'accent portent
 * data-accent (la lueur). La taille vient du cadre : largeur et hauteur retirées.
 */
export function prepareAnimatedSvg(text: string): AnimatedSvg | null {
  let markup: string
  try {
    markup = cleanSvg(text).markup
  } catch {
    return null
  }
  const colors = analyzeSvgColors(markup)
  if (!colors) return null
  const svg = new DOMParser().parseFromString(
    markup,
    "image/svg+xml"
  ).documentElement
  const size = drawingSize(svg)
  svg.removeAttribute("width")
  svg.removeAttribute("height")
  svg.setAttribute("aria-hidden", "true")
  svg.removeAttribute("role")
  svg.removeAttribute("aria-labelledby")

  const accent = colors.accent
  let order = 0
  let glint = false
  for (const shape of svg.querySelectorAll(SHAPES)) {
    const isTraced = painted(paintOf(shape, "stroke"))
    const paint = paintOf(shape, isTraced ? "stroke" : "fill")
    const motion = isTraced
      ? "trace"
      : shape.localName === "text"
        ? "reveal"
        : "fill"
    shape.setAttribute("data-motion", motion)
    // Le rang, pour décaler chaque forme (index.css).
    shape.setAttribute(
      "style",
      `${shape.getAttribute("style") ?? ""};--motion-order:${order++}`
    )
    if (isTraced) {
      shape.setAttribute("pathLength", "1")
      shape.setAttribute("data-pen", "")
    }
    if (motion === "fill" && paint) {
      // Le trait qui dessine le bord de la forme, à sa couleur, juste après elle.
      const pen = shape.cloneNode(false) as Element
      pen.removeAttribute("id")
      pen.setAttribute("data-motion", "pen")
      pen.setAttribute("data-pen", "")
      pen.setAttribute("pathLength", "1")
      pen.setAttribute("aria-hidden", "true")
      pen.setAttribute(
        "style",
        `${pen.getAttribute("style")};fill:none;stroke:${paint}`
      )
      if (size) pen.setAttribute("stroke-width", String(size * 0.02))
      shape.after(pen)
    }
    if (accent && paint && normalizeColor(paint) === accent) {
      shape.setAttribute("data-accent", "")
      glint = true
    }
  }
  return { markup: new XMLSerializer().serializeToString(svg), glint }
}

/**
 * Le moment et la durée du trait de chaque forme (dans l'ordre du fichier), en millisecondes :
 * les traits se suivent, chacun le temps de sa longueur, en DRAW_MS en tout ; une longueur
 * inconnue (0) compte comme la moyenne des autres, ou toutes égales.
 */
export function penTiming(lengths: readonly number[], totalMs = DRAW_MS) {
  const known = lengths.filter((length) => length > 0)
  const average =
    known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : 1
  const sizes = lengths.map((length) => (length > 0 ? length : average))
  const total = sizes.reduce((a, b) => a + b, 0)
  let start = 0
  return sizes.map((size) => {
    const ms = (size / total) * totalMs
    const timing = { delay: Math.round(start), ms: Math.round(ms) }
    start += ms
    return timing
  })
}

/**
 * Ce qui empêche l'animation de se jouer sur ce fichier (null : pas un SVG compatible) : « svg »
 * (il faut un SVG compatible), « accent » (la lueur, sans couleur d'accent), ou null si rien.
 */
export function motionBlocker(
  motion: Motion,
  svg: AnimatedSvg | null
): "svg" | "accent" | null {
  if (!SVG_MOTIONS.includes(motion)) return null
  if (svg === null) return "svg"
  return motion === "glint" && !svg.glint ? "accent" : null
}

const playable = (motion: Motion, svg: AnimatedSvg | null) =>
  motionBlocker(motion, svg) === null

/**
 * La boucle des animations : celles qui sont cochées et que le fichier sait jouer (la lueur
 * demande un accent), dans l'ordre de MOTIONS, chacune suivie d'une pause. Si aucune ne convient,
 * la respiration.
 */
export function motionLoop(
  svg: AnimatedSvg | null,
  chosen: readonly Motion[]
): { phase: MotionPhase; ms: number }[] {
  const animations = MOTIONS.filter(
    (motion) => chosen.includes(motion) && playable(motion, svg)
  )
  return (animations.length > 0 ? animations : (["breathe"] as const)).flatMap(
    (phase) => [
      { phase, ms: PHASE_MS[phase] },
      { phase: "rest" as const, ms: PHASE_MS.rest },
    ]
  )
}

/** Le texte d'un SVG à son adresse (data: d'un aperçu, ou fichier de l'espace « marque »). */
export async function fetchSvgText(url: string): Promise<string | null> {
  if (url.startsWith("data:image/svg+xml,")) {
    return decodeURIComponent(url.slice("data:image/svg+xml,".length))
  }
  if (!/\.svg(\?|$)/i.test(url)) return null
  const response = await fetch(url)
  return response.ok ? response.text() : null
}
