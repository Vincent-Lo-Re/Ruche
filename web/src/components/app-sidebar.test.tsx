import { fireEvent, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

describe("menu", () => {
  it("les icônes Lucide ont un trait d'un pixel, qui ne change pas avec leur taille", async () => {
    await renderApp("/account", fakeAuth({ role: "editor" }))

    const blog = await screen.findByRole("link", {
      name: texts.sections.blog.title,
    })
    const icon = blog.querySelector("svg")
    expect(icon).toHaveAttribute("stroke-width", "1")
    expect(icon?.querySelector("[vector-effect]")).toHaveAttribute(
      "vector-effect",
      "non-scaling-stroke"
    )
  })

  it("en bas du menu, le copyright au nom de la marque ; l'avatar est dans le header", async () => {
    await renderApp("/account", fakeAuth({ role: "admin" }))

    const copyright = await screen.findByText(
      texts.common.copyright(new Date().getFullYear(), texts.app.name)
    )
    const footer = copyright.closest<HTMLElement>('[data-sidebar="footer"]')
    expect(footer).not.toBeNull()
    expect(within(footer!).queryByRole("button")).toBeNull()
    expect(
      within(
        screen.getByRole("navigation", { name: texts.nav.label })
      ).queryByRole("link", { name: texts.sections.team.title })
    ).toBeNull()
  })

  it("toujours ouvert : ni bouton ni raccourci pour le replier", async () => {
    await renderApp("/account", fakeAuth({ role: "editor" }))
    const link = await screen.findByRole("link", {
      name: texts.sections.blog.title,
    })

    // Le header est au-dessus du menu et du contenu, pas dans le contenu.
    expect(
      document.querySelector('[data-slot="sidebar-inset"] > header')
    ).toBeNull()
    expect(
      document.querySelector('[data-sidebar="trigger"], [data-sidebar="rail"]')
    ).toBeNull()
    // Ctrl + B ne fait rien : le menu garde ses noms.
    fireEvent.keyDown(window, { key: "b", ctrlKey: true })
    expect(link).toHaveTextContent(texts.sections.blog.title)
    expect(document.querySelector('[data-slot="sidebar"]')).not.toHaveAttribute(
      "data-state"
    )
  })
})
