import { describe, expect, it } from "vitest"

import {
  groupOf,
  groupsWithIssues,
  sectionAnchor,
  styleSectionGroups,
} from "@/lib/app-style/sections"

describe("les sections de la charte", () => {
  it("rangées par groupe, dans l'ordre", () => {
    expect(styleSectionGroups.map((g) => g.group)).toEqual([
      "colors",
      "elements",
      "text",
      "shapes",
    ])
    expect(styleSectionGroups[2].sections).toEqual([
      "fonts",
      "fontRoles",
      "sizes",
    ])
  })

  it("une ancre par section", () => {
    expect(sectionAnchor("fontRoles")).toBe("style-font-roles")
  })

  it("la famille d'une section", () => {
    expect(groupOf("darkMode")).toBe("colors")
    expect(groupOf("file")).toBe("shapes")
  })

  it("les familles où un texte se lit mal", () => {
    expect(
      groupsWithIssues([
        { kind: "role", role: "muted", mode: "light", ratio: 2, min: 4.5 },
        { kind: "button", id: "x", mode: "dark", ratio: 2, min: 4.5 },
      ])
    ).toEqual(new Set(["colors", "elements"]))
  })
})
