import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("menu de l'avatar", () => {
  // L'avatar seul, tout à droite du header : le bouton se lit par ce qu'il fait.
  const trigger = () =>
    screen.getByRole("button", { name: texts.accountMenu.open })
  const openMenu = async () => {
    fireEvent.click(trigger())
    return screen.findByRole("menu")
  }

  it("l'avatar seul, en dernier dans le header ; son menu montre le nom, l'e-mail et le rôle", async () => {
    // Anne Admin (fakeAuth) : « A ».
    await renderApp("/", fakeAuth({ role: "editor" }))

    const header = screen
      .getByRole("navigation", { name: texts.header.label })
      .closest("header")!
    expect(within(header).getAllByRole("button").at(-1)).toBe(trigger())
    expect(trigger()).toHaveTextContent(`A${texts.accountMenu.open}`)
    expect(screen.queryByText(texts.roles.editor)).toBeNull()

    const menu = await openMenu()
    expect(within(menu).getByText("Anne Admin")).toBeVisible()
    expect(within(menu).getByText("anne@exemple.test")).toBeVisible()
    expect(within(menu).getByText(texts.roles.editor)).toBeVisible()
  })

  it("« Mon compte » ouvre la page du compte ; le thème reste dans le header", async () => {
    const { router } = await renderApp("/", fakeAuth({ role: "editor" }))

    const menu = await openMenu()
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: texts.sections.account.title })
    )
    await waitFor(() => expect(router.state.location.pathname).toBe("/account"))
  })

  it("« Se déconnecter » ferme la session ; le thème est dans le header", async () => {
    const { router } = await renderApp("/", fakeAuth({ role: "editor" }))

    const menu = await openMenu()
    expect(
      within(menu).queryByRole("menuitem", { name: texts.theme.title })
    ).toBeNull()
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: texts.common.signOut })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/sign-out")
    )
  })
})
