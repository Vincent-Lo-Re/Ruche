import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { clearPendingSignIn, savePendingSignIn } from "@/auth/pending-sign-in"
import * as identityApi from "@/lib/admin-identity"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"
import { NO_CUSTOM_NAMES } from "@/lib/section-names"
import { findRole } from "@/test/queries"

vi.mock("@/lib/admin-identity", async (importOriginal) => {
  const actual = await importOriginal<typeof identityApi>()
  return { ...actual, getAdminBrand: vi.fn() }
})

const brand = (
  screenImage: identityApi.AdminBrand["screenImage"]
): identityApi.AdminBrand => ({
  name: null,
  "logotype-light": null,
  "logotype-dark": null,
  "monogram-light": null,
  "monogram-dark": null,
  screenImage,
  monogramMotion: true,
  monogramMotions: ["trace", "glint", "breathe"],
  contactEmail: null,
  websiteUrl: null,
  language: "en",
  timeZone: "Europe/Paris",
  locale: null,
  initials: null,
  sectionNames: NO_CUSTOM_NAMES,
  variants: {},
})

afterEach(() => vi.clearAllMocks())

/** Le monogramme animé, sur l'image de droite : un SVG en ligne, nommé par la marque. */
const animatedMonogram = () =>
  document.querySelector(
    `[data-monogram] [role="img"][aria-label="${texts.app.name}"]`
  )

describe("pages de connexion (modèle login-04)", () => {
  it("montre l'image de l'écran de connexion à droite du formulaire", async () => {
    const url = "https://exemple.test/marque/connexion/photo.webp"
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue(
      brand({ path: "connexion/photo.webp", url })
    )
    await renderApp("/sign-in", fakeAuth("signed-out"))

    expect(await findRole("heading", texts.signIn.title)).toBeVisible()
    await waitFor(() =>
      expect(document.querySelector('img[alt=""]')).toHaveAttribute("src", url)
    )
    // Par-dessus : sans monogramme envoyé, le nom de la marque en texte (aucun logo de Ruche).
    expect(animatedMonogram()).toBeNull()
  })

  it("sans image, le fond sombre seul et les initiales (aucune image de Ruche)", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue(brand(null))
    await renderApp("/sign-in", fakeAuth("signed-out"))

    // Sans logo envoyé : le nom en texte en haut, l'initiale sur l'image (aucun logo de Ruche).
    await waitFor(() =>
      expect(screen.getAllByText(texts.app.name).length).toBeGreaterThan(0)
    )
    expect(screen.getByText("R")).toBeInTheDocument()
    expect(animatedMonogram()).toBeNull()
    expect(document.querySelector('img[alt=""]')).toBeNull()
    // Sous la carte, le © de l'année en cours.
    expect(
      screen.getByText(
        texts.common.copyright(new Date().getFullYear(), texts.app.name)
      )
    ).toBeVisible()
  })

  it("avec l'adresse de contact de la marque, l'aide de l'étape du code y mène", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue({
      ...brand(null),
      contactEmail: "aide@exemple.fr",
    })
    savePendingSignIn("anne@exemple.test")
    await renderApp("/sign-in", fakeAuth("signed-out"))

    const link = await findRole("link", "aide@exemple.fr")
    expect(link).toHaveAttribute("href", "mailto:aide@exemple.fr")
    clearPendingSignIn()
  })
})
