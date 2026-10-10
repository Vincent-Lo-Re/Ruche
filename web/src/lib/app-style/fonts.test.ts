import { describe, expect, it } from "vitest"

import schema from "../../../../blocks/blocks.schema.json"
import {
  closestWeight,
  fontFaces,
  fontFamilies,
  fontFiles,
  fontFolder,
  weightsOf,
} from "@/lib/app-style/fonts"
import { neutralStyle } from "@/lib/app-style/style"
import { en } from "@/texts/en"

describe("les polices", () => {
  it("les familles de l'admin sont celles du schéma (public/fonts/fonts.json)", () => {
    expect([...fontFamilies].sort()).toEqual(
      [...schema.definitions.styleFont.properties.family.enum].sort()
    )
  })

  it("les épaisseurs de chaque famille ; la plus proche en changeant", () => {
    expect(weightsOf("system")).toEqual([400, 500, 600, 700])
    expect(weightsOf("DM Serif Display")).toEqual([400])
    expect(closestWeight("DM Serif Display", 700)).toBe(400)
    expect(closestWeight("Inter", 600)).toBe(600)
  })

  it("le dossier d'une famille, comme private.font_folder", () => {
    expect(fontFolder("Source Serif 4")).toBe("source-serif-4")
  })

  it("les fichiers à copier : sans la police du téléphone, sans doublon", () => {
    const neutral = neutralStyle(en.appStyle.neutral)
    expect(fontFiles(neutral)).toEqual([])
    const fonts = neutral.fonts.map((font) => ({
      ...font,
      family: "Inter" as const,
      weight: 700 as const,
    }))
    expect(fontFiles({ ...neutral, fonts })).toEqual([
      { family: "Inter", weight: 700 },
    ])
    expect(fontFaces(fonts)).toContain('url("/fonts/inter/700.ttf")')
  })
})
