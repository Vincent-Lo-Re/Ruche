import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { helpFiches } from "@/help/fiches"
import * as identityApi from "@/lib/admin-identity"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"
import { NO_CUSTOM_NAMES } from "@/lib/section-names"
import { findRole, queryRole, role } from "@/test/queries"

vi.mock("@/lib/admin-identity", async (importOriginal) => ({
  ...(await importOriginal<typeof identityApi>()),
  getAdminBrand: vi.fn(),
}))

const brand = (websiteUrl: string | null): identityApi.AdminBrand => ({
  name: null,
  "logotype-light": null,
  "logotype-dark": null,
  "monogram-light": null,
  "monogram-dark": null,
  screenImage: null,
  monogramMotion: true,
  monogramMotions: ["breathe"],
  contactEmail: null,
  websiteUrl,
  language: "fr",
  timeZone: "Europe/Paris",
  locale: null,
  initials: null,
  sectionNames: NO_CUSTOM_NAMES,
  variants: {},
  loadingExit: null,
})

beforeEach(() => {
  vi.mocked(identityApi.getAdminBrand).mockResolvedValue(
    brand("https://example.com")
  )
})

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

const headerNav = () => role("navigation", texts.header.label)

describe("header (ADMIN § 7, « Un header sur toute la largeur »)", () => {
  it("à gauche : « Site web » (le site réglé dans Paramètres) dans un nouvel onglet, puis Mon compte, La team et Paramètres", async () => {
    await renderApp("/account", fakeAuth({ role: "admin" }))

    const site = await findRole(
      "link",
      new RegExp(`^${texts.header.website}`),
      headerNav()
    )
    expect(site).toHaveTextContent(texts.header.newTab)
    expect(site).toHaveAttribute("href", "https://example.com")
    expect(site).toHaveAttribute("target", "_blank")
    // La page ouverte est marquée dans le header.
    expect(role("link", "Mon compte", headerNav())).toHaveAttribute(
      "data-active"
    )
    // Il est au-dessus du menu et du contenu, sur toute la largeur.
    expect(headerNav().closest("header")?.parentElement).toHaveAttribute(
      "data-slot",
      "sidebar-wrapper"
    )
  })

  it("sans site web réglé, pas de lien « Site web »", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue(brand(null))
    await renderApp("/account", fakeAuth({ role: "admin" }))
    await findRole("link", "Mon compte", headerNav())
    expect(
      queryRole("link", new RegExp(`^${texts.header.website}`), headerNav())
    ).toBeNull()
  })

  it("à droite : le thème change au clic, sans menu (Clair, Sombre, Automatique)", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))
    const button = () => role("button", new RegExp(`^${texts.theme.title} :`))
    await findRole(
      "button",
      texts.theme.switch(texts.theme.system, texts.theme.light)
    )

    fireEvent.click(button())
    expect(screen.queryByRole("menu")).toBeNull()
    await waitFor(() =>
      expect(button()).toHaveAccessibleName(
        texts.theme.switch(texts.theme.light, texts.theme.dark)
      )
    )
    fireEvent.click(button())
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"))
    expect(button()).toHaveAccessibleName(
      texts.theme.switch(texts.theme.dark, texts.theme.system)
    )
  })

  it("le menu est toujours sombre, comme la colonne de gauche de la page du preset", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))
    await findRole("navigation", texts.nav.label)
    expect(document.querySelector('[data-slot="sidebar-inner"]')).toHaveClass(
      "dark"
    )
  })

  it("la recherche de l'aide : ⌘ K ou Ctrl + K, une fiche trouvée sans accents s'ouvre à droite", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))
    await findRole("button", new RegExp(texts.help.search))

    fireEvent.keyDown(document, { key: "k", ctrlKey: true, metaKey: true })
    fireEvent.keyDown(document, { key: "k", ctrlKey: true })
    const dialog = await screen.findByRole("dialog")
    const fiche = helpFiches[0]
    // Ses mots tapés sans accents ni majuscules suffisent.
    const typed = fiche.title
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
    fireEvent.change(within(dialog).getByRole("combobox"), {
      target: { value: typed },
    })
    fireEvent.click(await findRole("option", fiche.title, dialog))

    const sheet = await findRole("dialog", fiche.title)
    expect(within(sheet).getByText(fiche.summary)).toBeVisible()
    if (fiche.steps?.length) {
      expect(within(sheet).getByText(fiche.steps[0])).toBeVisible()
    }
  })

  it("une recherche sans fiche le dit", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))
    fireEvent.click(await findRole("button", new RegExp(texts.help.search)))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByRole("combobox"), {
      target: { value: "zzzz aucun mot" },
    })
    expect(await within(dialog).findByText(texts.help.empty)).toBeVisible()
  })

  it("les palettes : l'icône avant l'avatar ouvre une glissière, et le choix est gardé comme dans Mon compte", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))
    // Le header de la page : celui qui porte le menu du haut.
    const header = screen
      .getByRole("navigation", { name: texts.header.label })
      .closest("header")!
    const buttons = within(header).getAllByRole("button")
    const open = role("button", texts.theme.openPalettes, header)
    // Tout à droite, l'avatar du membre (account-menu.test.tsx).
    expect(buttons.at(-2)).toBe(open)

    fireEvent.click(open)
    const sheet = await findRole("dialog", texts.theme.title)
    expect(within(sheet).getByText(texts.theme.description)).toBeVisible()
    const presets = role("group", texts.colors.presets.title, sheet)
    fireEvent.click(within(presets).getAllByRole("button")[1])
    expect(localStorage.getItem("ruche-couleurs")).not.toBeNull()
    localStorage.clear()
    document.getElementById("ruche-couleurs")?.remove()
  })
})
