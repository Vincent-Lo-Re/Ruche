import { describe, expect, it } from "vitest"

import { displayTitle } from "@/lib/titles"
import { texts } from "@/texts"

describe("displayTitle", () => {
  it("garde le titre, sans les espaces autour", () => {
    expect(displayTitle("  Premier article ")).toBe("Premier article")
  })

  it("« Sans titre » quand il est vide", () => {
    for (const title of [null, undefined, "", "   "]) {
      expect(displayTitle(title)).toBe(texts.common.untitled)
    }
  })
})
