import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

describe("le pied des pages avec le menu", () => {
  it("la version de l'admin, sans lien", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))

    const version = screen.getByText(
      texts.footer.version(import.meta.env.VITE_APP_VERSION)
    )
    expect(version).toBeVisible()
    expect(version.closest("footer")?.querySelector("a")).toBeNull()
  })
})
