import { describe, expect, it } from "vitest"

import {
  contrast,
  readabilityIssues,
  styleProblems,
} from "@/lib/app-style/problems"
import { neutralStyle, type AppStyle } from "@/lib/app-style/style"
import { en } from "@/texts/en"

const neutral = neutralStyle(en.appStyle.neutral)
const missing = "00000000-0000-4000-8000-000000000999"

// Les mêmes cas que supabase/tests/61_charte_app.test.sql : l'admin et la base refusent pareil.
describe("styleProblems", () => {
  it("rien pour la charte neutre", () => {
    expect(styleProblems(neutral)).toEqual([])
  })

  it("un usage qui désigne une couleur ou une police absente", () => {
    expect(
      styleProblems({ ...neutral, roles: { ...neutral.roles, text: missing } })
    ).toEqual([{ rule: "reference", at: "roles.text" }])
    expect(
      styleProblems({
        ...neutral,
        fontRoles: { ...neutral.fontRoles, body: missing },
      })
    ).toEqual([{ rule: "reference", at: "fontRoles.body" }])
  })

  it("une teinte ou un bouton qui désigne une couleur absente, même inutilisée", () => {
    const tints = [{ ...neutral.tints[0], fill: missing }]
    expect(styleProblems({ ...neutral, tints })).toEqual([
      { rule: "reference", at: "tints.0.fill" },
    ])
    const buttons = neutral.buttons.map((button, i) =>
      i === 2 ? { ...button, end: missing } : button
    )
    expect(styleProblems({ ...neutral, buttons })).toEqual([
      { rule: "reference", at: "buttons.2.end" },
    ])
  })

  it("deux noms pareils (majuscules ignorées) : le nom du dernier", () => {
    const colors = neutral.colors.map((color, i) =>
      i === 1 ? { ...color, name: "WHITE" } : color
    )
    expect(styleProblems({ ...neutral, colors })).toEqual([
      { rule: "duplicateName", list: "colors", name: "WHITE" },
    ])
  })

  it("deux identifiants pareils", () => {
    const badges = [neutral.badges[0], { ...neutral.badges[0], name: "Other" }]
    expect(styleProblems({ ...neutral, badges })).toEqual([
      { rule: "duplicateId", list: "badges", id: neutral.badges[0].id },
    ])
  })
})

describe("contrast", () => {
  it("noir sur blanc : 21, une couleur sur elle-même : 1", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21)
    expect(contrast("#888888", "#888888")).toBeCloseTo(1)
  })
})

/** La charte neutre, la couleur d'id donné remplacée dans les deux modes. */
function withColor(style: AppStyle, index: number, value: string): AppStyle {
  return {
    ...style,
    colors: style.colors.map((color, i) =>
      i === index ? { ...color, light: value, dark: value } : color
    ),
  }
}

describe("readabilityIssues", () => {
  it("tout est lisible dans la charte neutre", () => {
    expect(readabilityIssues(neutral)).toEqual([])
  })

  it("un texte peu lisible, dans chaque mode gardé", () => {
    // Le gris du texte secondaire, presque blanc : illisible en clair, lisible en sombre.
    const pale = {
      ...neutral,
      colors: neutral.colors.map((color) =>
        color.name === "Text gray" ? { ...color, light: "#eeeeee" } : color
      ),
    }
    const issues = readabilityIssues(pale)
    expect(
      issues
        .filter((issue) => issue.kind === "role")
        .map((issue) => [issue.kind === "role" && issue.role, issue.mode])
    ).toEqual([
      ["muted", "light"],
      ["tabOff", "light"],
    ])
    // Toujours sombre : le mode clair ne compte plus.
    expect(readabilityIssues({ ...pale, darkMode: "dark" })).toEqual([])
  })

  it("un dégradé : le texte se lit sur ses deux bouts", () => {
    const [primary] = neutral.buttons
    // Du noir vers un gris très clair, texte blanc : illisible au bout clair.
    const style = withColor(
      {
        ...neutral,
        darkMode: "light",
        buttons: [
          { ...primary, kind: "gradient", end: neutral.colors[1].id },
          ...neutral.buttons.slice(1),
        ],
      },
      1,
      "#f4f4f5"
    )
    expect(
      readabilityIssues(style).map(
        (issue) => issue.kind === "button" && issue.id
      )
    ).toEqual([primary.id])
  })
})
