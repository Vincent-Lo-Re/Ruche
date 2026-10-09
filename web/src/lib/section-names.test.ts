import { describe, expect, it } from "vitest"

import {
  NO_CUSTOM_NAMES,
  resolveSectionNames,
  type CustomSectionNames,
} from "@/lib/section-names"

const custom: CustomSectionNames = {
  fr: {
    blog: { name: "Le Fil", le: "le Fil", du: "du Fil" },
    podcasts: null,
  },
  en: { blog: "The Feed", podcasts: null },
}

describe("les noms du Blog et des Podcasts", () => {
  it("sans nom écrit, ceux d'origine, avec leurs formes françaises", () => {
    expect(resolveSectionNames(NO_CUSTOM_NAMES, "fr")).toEqual({
      blog: { name: "Blog", le: "le Blog", du: "du Blog" },
      podcasts: { name: "Podcasts", le: "les Podcasts", du: "des Podcasts" },
    })
    expect(resolveSectionNames(NO_CUSTOM_NAMES, "en").podcasts.name).toBe(
      "Podcasts"
    )
  })

  it("prend chaque forme écrite par l'admin, dans la langue demandée", () => {
    const fr = resolveSectionNames(custom, "fr")
    expect(fr.blog).toEqual({ name: "Le Fil", le: "le Fil", du: "du Fil" })
    // Une section non renommée garde son nom d'origine.
    expect(fr.podcasts.du).toBe("des Podcasts")
    expect(resolveSectionNames(custom, "en").blog.name).toBe("The Feed")
  })
})
