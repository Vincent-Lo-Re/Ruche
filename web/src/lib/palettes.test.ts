import { afterEach, describe, expect, it } from "vitest"

import {
  applyPalette,
  DEFAULT_PALETTE,
  PALETTE_STORAGE_KEY,
  paletteCss,
  readPalette,
  savePalette,
  swatchCss,
} from "@/lib/palettes"

afterEach(() => {
  localStorage.clear()
  document.getElementById("ruche-couleurs")?.remove()
})

describe("paletteCss", () => {
  it("les couleurs de départ (Neutre, sans accent) ne changent rien à index.css", () => {
    expect(paletteCss(DEFAULT_PALETTE)).toBe("")
  })

  it("Pierre (l'ancienne base de départ) se choisit comme les autres : ses gris sont posés", () => {
    const css = paletteCss({ base: "stone", accent: "none" })
    expect(css).toContain("--muted: oklch(0.97 0.001 106.424);")
  })

  it("une base pose ses gris en clair et en sombre", () => {
    const css = paletteCss({ base: "zinc", accent: "none" })
    expect(css).toContain(":root {\n  --background: oklch(1 0 0);")
    expect(css).toContain("--muted: oklch(0.967 0.001 286.375);")
    expect(css).toContain(".dark {")
    expect(css).not.toContain("--sidebar-active")
    expect(css).not.toContain("--nav-active")
  })

  it("un accent pose ses jetons, comme shadcn : principale, secondaire, graphiques", () => {
    const css = paletteCss({ base: "neutral", accent: "blue" })
    const root = css.slice(0, css.indexOf(".dark"))
    expect(root).toContain("--primary: oklch(0.488 0.243 264.376);")
    expect(root).toContain("--secondary: oklch(0.967 0.001 286.375);")
    expect(root).toContain("--chart-1: oklch(0.809 0.105 251.813);")
    // sidebar-primary ne sert qu'aux couleurs des logos : pas de variable CSS.
    expect(root).not.toContain("--sidebar-primary")
    // L'élément choisi du menu (toujours sombre) : la couleur des boutons de la page, en clair comme
    // en sombre.
    expect(css).toContain(
      '.dark[data-slot="sidebar-inner"] {\n  --sidebar-active: var(--page-primary);'
    )
    // Le lien choisi du header aussi.
    expect(root).toContain("--nav-active: var(--page-primary);")
    // Neutre est la base de départ : ses gris ne sont pas repris.
    expect(css).not.toContain("--background")
  })

  it("sans accent, le menu garde sa teinte de base et rien de plus", () => {
    const css = paletteCss({ base: "mauve", accent: "none" })
    expect(css).toContain(".dark {")
    expect(css).not.toContain("sidebar-inner")
  })

  it("l'accent passe après la base : sa couleur principale l'emporte", () => {
    const css = paletteCss({ base: "olive", accent: "red" })
    const root = css.slice(0, css.indexOf(".dark"))
    expect(root.match(/--primary: /g)).toHaveLength(1)
    expect(root).toContain("--primary: oklch(0.505 0.213 27.518);")
  })
})

describe("le choix sur ce navigateur", () => {
  it("gardé, relu ; une valeur abîmée rend les couleurs de départ", () => {
    expect(readPalette()).toEqual(DEFAULT_PALETTE)
    savePalette({ base: "mist", accent: "teal" })
    expect(readPalette()).toEqual({ base: "mist", accent: "teal" })
    localStorage.setItem(PALETTE_STORAGE_KEY, '{"base":"rouge"}')
    expect(readPalette()).toEqual(DEFAULT_PALETTE)
  })

  it("posé sur la page dans une seule balise style, remplacée à chaque choix", () => {
    applyPalette({ base: "zinc", accent: "none" })
    applyPalette({ base: "stone", accent: "pink" })
    const styles = document.querySelectorAll("#ruche-couleurs")
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toContain(
      "--primary: oklch(0.525 0.223 3.958);"
    )
  })

  it("les pastilles de chaque carte sont tirées des palettes", () => {
    const css = swatchCss()
    // Stone et orange : le gris sombre de Stone, le bouton et les graphiques de l'accent orange.
    expect(css).toContain(
      '[data-preset="stone-orange"] [data-swatch="menu"] { background-color: oklch(0.216 0.006 56.043); }'
    )
    expect(css).toContain(
      '[data-preset="stone-orange"] [data-swatch="ink"] { background-color: oklch(0.553 0.195 38.402); }'
    )
    // Neutre : les couleurs d'index.css.
    expect(css).toContain(
      '[data-preset="neutral-none"] [data-swatch="chart-5"] { background-color: oklch(0.269 0 0); }'
    )
    expect(css.split("\n")).toHaveLength(11 * 7)
  })
})
