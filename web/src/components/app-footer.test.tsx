import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"
import { role } from "@/test/queries"

describe("le pied des pages avec le menu", () => {
  it("la version de l'admin, et un e-mail pour signaler un bug ou demander une fonctionnalité", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))

    expect(
      screen.getByText(texts.footer.version(import.meta.env.VITE_APP_VERSION))
    ).toBeVisible()
    expect(role("link", texts.footer.feedback)).toHaveAttribute(
      "href",
      "mailto:ruche.press@gmail.com"
    )
  })
})
