import { describe, expect, it } from "vitest"

import neutralCase from "../../../../blocks/cases/accepte-charte-neutre.json"
import {
  colorInUse,
  fontInUse,
  freeName,
  nameKey,
  neutralStyle,
  sameStyle,
  styleModes,
} from "@/lib/app-style/style"
import { en } from "@/texts/en"

const neutral = neutralStyle(en.appStyle.neutral)

describe("la charte neutre", () => {
  it("en anglais, c'est le cas partagé que la base accepte (blocks/cases)", () => {
    expect(sameStyle(neutral, neutralCase.data as typeof neutral)).toBe(true)
  })

  it("suit le téléphone en clair et en sombre", () => {
    expect(styleModes(neutral)).toEqual(["light", "dark"])
    expect(styleModes({ ...neutral, darkMode: "light" })).toEqual(["light"])
  })
})

describe("sameStyle", () => {
  it("ne tient pas compte de l'ordre des clés (la base rend le sien)", () => {
    const reordered = JSON.parse(
      JSON.stringify(neutral, Object.keys(neutral).reverse())
    )
    expect(sameStyle(neutral, { ...reordered, ...neutral })).toBe(true)
    expect(sameStyle(neutral, { ...neutral, radius: 4 })).toBe(false)
    expect(sameStyle(null, null)).toBe(true)
  })
})

describe("utilisations", () => {
  it("une couleur d'un usage, d'une teinte ou d'un bouton est utilisée", () => {
    const [white] = neutral.colors
    expect(colorInUse(neutral, white.id)).toBe(true)
    const extra = {
      ...neutral.colors[0],
      id: crypto.randomUUID(),
      name: "Extra",
    }
    expect(
      colorInUse({ ...neutral, colors: [...neutral.colors, extra] }, extra.id)
    ).toBe(false)
  })

  it("une police d'un usage est utilisée", () => {
    expect(fontInUse(neutral, neutral.fonts[0].id)).toBe(true)
    expect(fontInUse(neutral, crypto.randomUUID())).toBe(false)
  })
})

describe("noms", () => {
  it("majuscules et espaces ne comptent pas, comme dans la base", () => {
    expect(nameKey("  Gris   CLAIR ")).toBe("gris clair")
  })

  it("un nom libre : le nom, puis « 2 », « 3 »…", () => {
    expect(freeName("New color", [])).toBe("New color")
    expect(
      freeName("New color", [{ name: "new color" }, { name: "New color 2" }])
    ).toBe("New color 3")
  })
})
