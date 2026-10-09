import { describe, expect, it } from "vitest"

import type { Term } from "@/lib/term-forms"
import {
  capitalized,
  du,
  frenchSample,
  frenchTerm,
  le,
} from "@/texts/grammar/fr"

const term = (name: string, traits: Term["traits"] = {}): Term => ({
  name,
  traits: { gender: "masculine", ...traits },
})

describe("la grammaire française des termes", () => {
  it("le, la, l', les ; du, de la, de l', des", () => {
    expect(le(term("Blog"))).toBe("le Blog")
    expect(le(term("Revue", { gender: "feminine" }))).toBe("la Revue")
    expect(le(term("Agenda", { elided: true }))).toBe("l'Agenda")
    expect(du(term("Actualités", { gender: "feminine", plural: true }))).toBe(
      "des Actualités"
    )
    expect(du(term("Agenda", { elided: true }))).toBe("de l'Agenda")
    expect(capitalized(le(term("Agenda", { elided: true })))).toBe("L'Agenda")
  })

  it("l'aperçu, avec au, à la, à l', aux", () => {
    expect(frenchSample(term("Revue", { gender: "feminine" }))).toBe(
      "La Revue · dans la liste de la Revue · à la Revue"
    )
    expect(
      frenchSample(term("Actualités", { gender: "feminine", plural: true }))
    ).toBe("Les Actualités · dans la liste des Actualités · aux Actualités")
  })

  it("sans terme enregistré, les mots de l'admin", () => {
    expect(frenchTerm("blog").name).toBe("Blog")
    expect(du(frenchTerm("podcasts"))).toBe("des Podcasts")
  })
})
