import { describe, expect, it } from "vitest"

import { neutralStyle } from "@/lib/app-style/style"
import {
  blocksVariables,
  styleVariables,
  tintVariables,
} from "@/lib/app-style/variables"
import { en } from "@/texts/en"

const neutral = neutralStyle(en.appStyle.neutral)

describe("la charte en variables du téléphone de l'éditeur", () => {
  it("les couleurs du mode montré, les tailles, les arrondis et les liens", () => {
    const light = blocksVariables(neutral, "light")
    expect(light["--blocks-color-background"]).toBe("#ffffff")
    expect(light["--blocks-color-text"]).toBe("#18181b")
    expect(light["--blocks-font-title-size"]).toBe("28px")
    expect(light["--blocks-font-h2-size"]).toBe("22px")
    // Entre l'intertitre (22) et le texte (17).
    expect(light["--blocks-font-h3-size"]).toBe("20px")
    expect(light["--blocks-radius-box"]).toBe("12px")
    expect(light["--blocks-link-decoration"]).toBe("underline")
    expect(blocksVariables(neutral, "dark")["--blocks-color-background"]).toBe(
      "#121214"
    )
    expect(
      blocksVariables({ ...neutral, underlineLinks: false }, "light")[
        "--blocks-link-decoration"
      ]
    ).toBe("none")
  })

  it("la police du téléphone, ou celle de la charte servie par l'admin", () => {
    expect(blocksVariables(neutral, "light")["--blocks-font-family"]).toContain(
      "system-ui"
    )
    const fonts = neutral.fonts.map((font, index) =>
      index === 0 ? { ...font, family: "Lora" as const } : font
    )
    const titled = blocksVariables({ ...neutral, fonts }, "light")
    expect(titled["--blocks-font-title-family"]).toContain("ruche-lora-700")
    expect(titled["--blocks-font-title-weight"]).toBe("700")
  })

  it("une teinte : la sienne, sinon la première (absente ou disparue)", () => {
    const [first] = neutral.tints
    expect(tintVariables(neutral, "light")["--blocks-tint-fill"]).toBe(
      "#f4f4f5"
    )
    expect(
      tintVariables(neutral, "light", "00000000-0000-4000-8000-000000000999")
    ).toEqual(tintVariables(neutral, "light", first.id))
    // Le téléphone porte la première teinte, pour les encadrés sans teinte choisie.
    expect(blocksVariables(neutral, "light")).toMatchObject(
      tintVariables(neutral, "light")
    )
  })

  it("l'aperçu de la charte : une variable par usage", () => {
    const vars = styleVariables(neutral, "light")
    expect(vars["--style-top-bar"]).toBe("#ffffff")
    expect(vars["--style-shadow"]).toBe("none")
  })
})
