import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as identityApi from "@/lib/admin-identity"
import { NO_CUSTOM_NAMES } from "@/lib/section-names"
import { findRole, queryRole, role } from "@/test/queries"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

// App mobile › Identité (ADMIN § 1) : les cartes de Paramètres › Identité de l'admin, pour l'app.
// Tout part vers l'identité de l'app (« app ») ; celle de l'admin ne bouge pas.

vi.mock("@/lib/admin-identity", async (importOriginal) => {
  const actual = await importOriginal<typeof identityApi>()
  return {
    ...actual,
    getAdminBrand: vi.fn(),
    getAppBrand: vi.fn(),
    saveBrandDetails: vi.fn(),
    saveBrandFile: vi.fn(),
    saveBrandVariants: vi.fn(),
    saveOtherSurface: vi.fn(),
    // jsdom ne dessine pas : la clarté d'un fichier ne se mesure pas ici.
    brandFileSurface: vi.fn(async () => null),
    removeBrandFile: vi.fn(),
    prepareScreenImage: vi.fn(),
    saveScreenImage: vi.fn(),
    removeScreenImage: vi.fn(),
    saveMonogramMotion: vi.fn(),
    saveMonogramMotions: vi.fn(),
  }
})

const words = texts.appPages.identity
const files = texts.settings.adminIdentity.files

/** Une identité sans fichier, avec ce nom. */
const identity = (name: string | null): identityApi.BrandIdentity => ({
  name,
  "logotype-light": null,
  "logotype-dark": null,
  "monogram-light": null,
  "monogram-dark": null,
  screenImage: null,
  monogramMotion: false,
  monogramMotions: [],
  contactEmail: null,
  websiteUrl: null,
  initials: null,
  variants: {},
})

beforeEach(() => {
  vi.mocked(identityApi.getAdminBrand).mockResolvedValue({
    ...identity("Ruche admin"),
    language: "en",
    timeZone: "Europe/Paris",
    locale: null,
    sectionNames: NO_CUSTOM_NAMES,
  })
  vi.mocked(identityApi.getAppBrand).mockResolvedValue(identity("Essaim"))
  vi.mocked(identityApi.saveBrandDetails).mockResolvedValue()
  vi.mocked(identityApi.saveBrandFile).mockResolvedValue()
  vi.mocked(identityApi.saveOtherSurface).mockResolvedValue()
  vi.mocked(identityApi.removeBrandFile).mockResolvedValue()
  vi.mocked(identityApi.saveScreenImage).mockResolvedValue()
  vi.mocked(identityApi.removeScreenImage).mockResolvedValue()
  vi.mocked(identityApi.saveMonogramMotion).mockResolvedValue()
  vi.mocked(identityApi.saveMonogramMotions).mockResolvedValue()
})

afterEach(() => vi.clearAllMocks())

describe("App mobile › Identité : la page", () => {
  it("les trois sections de l'identité", async () => {
    await renderApp("/app/identity")
    expect(
      await findRole("heading", texts.sections.appIdentity.title)
    ).toBeVisible()
    for (const title of [
      texts.settings.adminIdentity.title,
      words.loadingScreen.title,
      files.title,
    ]) {
      expect(role("heading", title)).toBeVisible()
    }
    expect(screen.queryByText(texts.appPages.soon.title)).toBeNull()
  })

  it("reste réservée aux admins", async () => {
    await renderApp("/app/identity", fakeAuth({ role: "editor" }))
    expect(queryRole("heading", words.loadingScreen.title)).toBeNull()
    expect(identityApi.getAppBrand).not.toHaveBeenCalled()
  })
})

describe("App mobile › Identité : la marque", () => {
  it("le nom de l'app, à part de celui de l'admin ; enregistré pour l'app", async () => {
    await renderApp("/app/identity")
    const name = await screen.findByLabelText(texts.settings.adminIdentity.name)
    expect(name).toHaveValue("Essaim")
    // Le header garde la marque de l'admin.
    expect(role("link", /Ruche admin/)).toHaveAttribute("href", "/")

    fireEvent.change(name, { target: { value: "Ruchette" } })
    fireEvent.click(role("button", texts.common.save))
    await waitFor(() =>
      expect(identityApi.saveBrandDetails).toHaveBeenCalledWith("app", {
        name: "Ruchette",
        initials: null,
        contactEmail: null,
        websiteUrl: null,
      })
    )
    // L'identité de l'app est relue, pas celle de l'admin.
    await waitFor(() =>
      expect(
        vi.mocked(identityApi.getAppBrand).mock.calls.length
      ).toBeGreaterThan(1)
    )
    expect(identityApi.getAdminBrand).toHaveBeenCalledTimes(1)
  })
})

describe("App mobile › Identité : l'écran de chargement", () => {
  it("dans un téléphone clair au départ, sombre au choix ; sans image, le fond uni", async () => {
    await renderApp("/app/identity")
    const phone = await findRole("img", words.loadingScreen.preview)
    expect(phone).toHaveAttribute("data-blocks-theme", "light")
    expect(phone.querySelector('img[alt=""]')).toBeNull()
    // Les initiales de l'app, sans monogramme envoyé.
    expect(phone).toHaveTextContent("E")

    const themes = role("group", words.loadingScreen.theme)
    fireEvent.click(role("button", texts.theme.dark, themes))
    expect(phone).toHaveAttribute("data-blocks-theme", "dark")
  })

  it("le monogramme de l'app pour le fond du téléphone", async () => {
    vi.mocked(identityApi.getAppBrand).mockResolvedValue({
      ...identity("Essaim"),
      "monogram-light": { path: "c.png", url: "https://exemple.fr/clair.png" },
      "monogram-dark": { path: "s.png", url: "https://exemple.fr/sombre.png" },
    })
    await renderApp("/app/identity")
    const phone = await findRole("img", words.loadingScreen.preview)
    await waitFor(() =>
      expect(
        within(phone).getByRole("img", { name: "Essaim" })
      ).toHaveAttribute("src", "https://exemple.fr/clair.png")
    )
    fireEvent.click(
      role("button", texts.theme.dark, role("group", words.loadingScreen.theme))
    )
    await waitFor(() =>
      expect(
        within(phone).getByRole("img", { name: "Essaim" })
      ).toHaveAttribute("src", "https://exemple.fr/sombre.png")
    )
  })

  it("l'image de fond part vers l'app, réduite ; elle se retire", async () => {
    const image = {
      path: "app-chargement/00000000-0000-4000-8000-000000000006.webp",
      url: "https://exemple.test/marque/app-chargement/photo.webp",
    }
    vi.mocked(identityApi.getAppBrand).mockResolvedValue({
      ...identity("Essaim"),
      screenImage: image,
    })
    const reduced = new Blob(["x"], { type: "image/webp" })
    vi.mocked(identityApi.prepareScreenImage).mockResolvedValue(reduced)
    await renderApp("/app/identity")

    const phone = await findRole("img", words.loadingScreen.preview)
    await waitFor(() =>
      expect(phone.querySelector('img[alt=""]')).toHaveAttribute(
        "src",
        image.url
      )
    )
    const photo = new File(["x"], "photo.jpg", { type: "image/jpeg" })
    fireEvent.change(screen.getByLabelText(words.loadingScreen.title), {
      target: { files: [photo] },
    })
    await waitFor(() =>
      expect(identityApi.saveScreenImage).toHaveBeenCalledWith(
        "app",
        reduced,
        image.path
      )
    )
    const card = phone.closest('[data-slot="card"]') as HTMLElement
    fireEvent.click(role("button", files.remove, card))
    await waitFor(() =>
      expect(identityApi.removeScreenImage).toHaveBeenCalledWith(
        "app",
        image.path
      )
    )
  })

  it("le monogramme animé et ses animations, pour l'app", async () => {
    await renderApp("/app/identity")
    const motion = files.monogramMotion
    fireEvent.click(await findRole("switch", motion.toggle))
    await waitFor(() =>
      expect(identityApi.saveMonogramMotion).toHaveBeenCalledWith("app", true)
    )
    // Sans monogramme, les initiales : ni tracé, ni cascade, ni lueur.
    const group = role("list", motion.group)
    expect(role("checkbox", motion.motions.trace, group)).toHaveAttribute(
      "aria-disabled",
      "true"
    )
  })
})

describe("App mobile › Identité : les logos", () => {
  it("quatre cases, leur usage dans l'app ; un fichier part vers l'app, et se retire", async () => {
    const logo = {
      path: "app-logotype-sombre/a.svg",
      url: "https://cdn.test/a.svg",
    }
    vi.mocked(identityApi.getAppBrand).mockResolvedValue({
      ...identity("Essaim"),
      "logotype-dark": logo,
    })
    await renderApp("/app/identity")
    const light = files.label(files.logotype.title, files.light)
    const dark = files.label(files.logotype.title, files.dark)
    await screen.findByLabelText(light)
    expect(document.querySelectorAll("[data-file-slot]")).toHaveLength(4)
    expect(screen.getByText(`· ${words.logos.logotype}`)).toBeVisible()

    const png = new File(["x"], "logo.png", { type: "image/png" })
    fireEvent.change(screen.getByLabelText(light), {
      target: { files: [png] },
    })
    await waitFor(() =>
      expect(identityApi.saveBrandFile).toHaveBeenCalledWith(
        "app",
        "logotype-light",
        expect.objectContaining({ mime: "image/png" }),
        null
      )
    )
    const card = document.querySelector(
      `[data-file-slot="${dark}"]`
    ) as HTMLElement
    fireEvent.click(role("button", files.remove, card))
    await waitFor(() =>
      expect(identityApi.removeBrandFile).toHaveBeenCalledWith(
        "app",
        "logotype-dark",
        logo.path
      )
    )
  })

  it("un SVG aux couleurs modifiables propose sa version pour l'autre fond, sans palettes", async () => {
    await renderApp("/app/identity")
    const light = files.label(files.monogram.title, files.light)
    const svg = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect fill="#f59e0b" width="4" height="4"/><path fill="#111111" d="M5 0h1v4H5z"/></svg>',
      ],
      "monogramme.svg",
      { type: "image/svg+xml" }
    )
    fireEvent.change(await screen.findByLabelText(light), {
      target: { files: [svg] },
    })

    const words = files.variants.otherOnly
    const dialog = await findRole("alertdialog", words.title.dark)
    expect(queryRole("dialog", files.variants.title)).toBeNull()
    fireEvent.click(role("button", words.confirm, dialog))
    await waitFor(() =>
      expect(identityApi.saveOtherSurface).toHaveBeenCalledWith(
        "app",
        expect.objectContaining({
          colors: { main: "#111111", accent: "#f59e0b" },
        }),
        "monogram-dark"
      )
    )
    expect(identityApi.saveBrandFile).toHaveBeenCalledWith(
      "app",
      "monogram-light",
      expect.anything(),
      null
    )
    expect(identityApi.saveBrandVariants).not.toHaveBeenCalled()
  })
})
