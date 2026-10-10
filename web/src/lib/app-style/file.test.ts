import { describe, expect, it } from "vitest"

import { parseStyleFile } from "@/lib/app-style/file"
import { neutralStyle } from "@/lib/app-style/style"
import { en } from "@/texts/en"

const neutral = neutralStyle(en.appStyle.neutral)

describe("parseStyleFile", () => {
  it("lit une charte exportée", () => {
    expect(parseStyleFile(JSON.stringify(neutral))).toEqual({ style: neutral })
  })

  it("refuse ce qui n'est pas du JSON, ou pas une charte", () => {
    expect(parseStyleFile("pas du json")).toHaveProperty("problems")
    expect(parseStyleFile(JSON.stringify({ v: 1 }))).toHaveProperty("problems")
  })

  it("refuse une charte dont un usage désigne une couleur absente", () => {
    const broken = {
      ...neutral,
      roles: { ...neutral.roles, text: "00000000-0000-4000-8000-000000000999" },
    }
    expect(parseStyleFile(JSON.stringify(broken))).toEqual({
      problems: [{ rule: "reference", at: "roles.text" }],
    })
  })
})
