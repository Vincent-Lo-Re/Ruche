import { AuthApiError } from "@supabase/supabase-js"
import { fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { detachedAuth, supabase } from "@/lib/supabase"
import { fakeAuth, renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.getElementById("ruche-couleurs")?.remove()
})

describe("Mon compte", () => {
  it("montre le profil et la date de la double vérification", async () => {
    await renderApp("/account", fakeAuth({ role: "editor" }))

    expect(screen.getByLabelText(texts.account.profile.name)).toHaveValue(
      testProfile.full_name
    )
    // Dans la page : le menu de gauche montre aussi le rôle, à côté de l'avatar.
    const page = within(screen.getByRole("main"))
    // L'adresse grisée (elle se change par « Modifier ») ; le rôle en pastille en haut à droite de la page.
    expect(page.getByLabelText(texts.account.profile.email)).toHaveValue(
      testProfile.email
    )
    expect(page.getByLabelText(texts.account.profile.email)).toBeDisabled()
    expect(page.getByText(texts.roles.editor)).toBeVisible()
    expect(
      screen.getByText(texts.account.mfa.configuredOn("27 sept. 2026 à 14h30"))
    ).toBeVisible()
    expect(screen.getByText(texts.account.mfa.configured)).toBeVisible()
  })

  it("la langue : rangée sur le compte du membre, avec un message si l'enregistrement échoue", async () => {
    const updateUser = vi.spyOn(supabase.auth, "updateUser").mockResolvedValue({
      data: { user: null },
      error: new Error("hors ligne"),
    } as never)
    await renderApp("/account", fakeAuth({ role: "editor" }))
    const labels = texts.account.language

    fireEvent.click(screen.getByRole("combobox", { name: labels.label }))
    const english = await screen.findByRole("option", {
      name: texts.languages.en,
    })
    // Base UI ne retient un clic de souris que s'il a commencé sur l'option.
    fireEvent.pointerDown(english, { pointerType: "mouse" })
    fireEvent.click(english)

    expect(await screen.findByText(labels.failed)).toBeVisible()
    expect(updateUser).toHaveBeenCalledWith({ data: { language: "en" } })
  })

  describe("changer d'adresse e-mail", () => {
    const labels = texts.account.emailChange

    async function openDialog() {
      await renderApp("/account", fakeAuth({ role: "editor" }))
      fireEvent.click(screen.getByRole("button", { name: labels.open }))
      return screen.findByRole("dialog")
    }

    function askFor(dialog: HTMLElement, email: string) {
      fireEvent.change(within(dialog).getByLabelText(labels.newEmail), {
        target: { value: email },
      })
      fireEvent.click(within(dialog).getByRole("button", { name: labels.send }))
    }

    it("la nouvelle adresse, puis son code : le 6e chiffre confirme, le profil suit", async () => {
      const updateUser = vi
        .spyOn(supabase.auth, "updateUser")
        .mockResolvedValue({ data: { user: null }, error: null } as never)
      const verify = vi.spyOn(detachedAuth, "verifyOtp").mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as never)
      // La session du membre (double vérification passée) est relue, pas remplacée.
      const refresh = vi
        .spyOn(supabase.auth, "refreshSession")
        .mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        } as never)
      const dialog = await openDialog()

      askFor(dialog, "nouvelle@exemple.test")
      expect(
        await within(dialog).findByText(
          labels.codeSent("nouvelle@exemple.test")
        )
      ).toBeVisible()
      expect(updateUser).toHaveBeenCalledWith({
        email: "nouvelle@exemple.test",
      })

      fireEvent.change(within(dialog).getByLabelText(labels.code), {
        target: { value: "123456" },
      })
      expect(await screen.findByText(labels.done)).toBeVisible()
      expect(verify).toHaveBeenCalledTimes(1)
      expect(verify).toHaveBeenCalledWith({
        email: "nouvelle@exemple.test",
        token: "123456",
        type: "email_change",
      })
      expect(refresh).toHaveBeenCalledTimes(1)
    })

    it("un code refusé pour la nouvelle adresse est essayé pour l'actuelle, puis vidé", async () => {
      vi.spyOn(supabase.auth, "updateUser").mockResolvedValue({
        data: { user: null },
        error: null,
      } as never)
      const verify = vi.spyOn(detachedAuth, "verifyOtp").mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError(
          "Token has expired or is invalid",
          403,
          "otp_expired"
        ),
      } as never)
      const dialog = await openDialog()
      askFor(dialog, "nouvelle@exemple.test")
      const code = await within(dialog).findByLabelText(labels.code)

      fireEvent.change(code, { target: { value: "123456" } })

      expect(await screen.findByText(texts.signIn.wrongCode)).toBeVisible()
      expect(code).toHaveValue("")
      expect(verify).toHaveBeenCalledTimes(2)
      expect(verify).toHaveBeenLastCalledWith({
        email: testProfile.email,
        token: "123456",
        type: "email_change",
      })
    })

    it("refuse sa propre adresse sans rien envoyer, et dit qu'une adresse est déjà prise", async () => {
      const updateUser = vi
        .spyOn(supabase.auth, "updateUser")
        .mockResolvedValue({
          data: { user: null },
          error: new AuthApiError("Already registered", 422, "email_exists"),
        } as never)
      const dialog = await openDialog()

      askFor(dialog, testProfile.email.toUpperCase())
      expect(await within(dialog).findByText(labels.sameEmail)).toBeVisible()
      expect(updateUser).not.toHaveBeenCalled()

      askFor(dialog, "prise@exemple.test")
      expect(await within(dialog).findByText(labels.taken)).toBeVisible()
      expect(within(dialog).getByLabelText(labels.newEmail)).toBeVisible()
    })
  })

  it("refuse un nom trop long sans rien envoyer", async () => {
    const from = vi.spyOn(supabase, "from")
    await renderApp("/account")

    fireEvent.change(screen.getByLabelText(texts.account.profile.name), {
      target: { value: "a".repeat(101) },
    })
    fireEvent.click(screen.getByRole("button", { name: texts.common.save }))

    expect(
      await screen.findByText(texts.account.profile.nameTooLong)
    ).toBeVisible()
    expect(from).not.toHaveBeenCalled()
  })

  it("les couleurs : une palette d'une base et d'un accent, appliquée et gardée sur ce navigateur", async () => {
    await renderApp("/account", fakeAuth({ role: "editor" }))
    const colors = texts.colors
    const presets = screen.getByRole("group", { name: colors.presets.title })
    const preset = (id: keyof typeof colors.presets.names) =>
      within(presets).getByRole("button", {
        name: new RegExp(colors.presets.names[id]),
      })

    // Le preset d'origine en tête (Nova, tout en Neutral), choisi au départ, puis les dix palettes,
    // chacune sous un nom inventé qui mêle ses deux couleurs.
    const buttons = within(presets).getAllByRole("button")
    expect(buttons).toHaveLength(11)
    expect(buttons[0]).toHaveTextContent(colors.presets.names["neutral-none"])
    // Rien à réinitialiser tant que la palette d'origine est choisie.
    expect(
      screen.queryByRole("button", { name: colors.presets.reset })
    ).toBeNull()
    // Plus de pastilles de base ni d'accent : seules les palettes se choisissent.
    expect(screen.queryByRole("group", { name: "Couleur de base" })).toBeNull()

    const zincBlue = preset("zinc-blue")
    fireEvent.click(zincBlue)
    expect(zincBlue).toHaveAttribute("aria-pressed", "true")
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false")
    const style = document.getElementById("ruche-couleurs")
    expect(style?.textContent).toContain(
      "--primary: oklch(0.488 0.243 264.376);"
    )
    expect(style?.textContent).toContain("--muted: oklch(0.967 0.001 286.375);")
    expect(JSON.parse(localStorage.getItem("ruche-couleurs")!)).toEqual({
      base: "zinc",
      accent: "blue",
    })

    const stoneOrange = preset("stone-orange")
    fireEvent.click(stoneOrange)
    expect(stoneOrange).toHaveAttribute("aria-pressed", "true")
    expect(zincBlue).toHaveAttribute("aria-pressed", "false")

    // « Réinitialiser » revient à Neutrine, puis disparaît.
    fireEvent.click(screen.getByRole("button", { name: colors.presets.reset }))
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true")
    expect(stoneOrange).toHaveAttribute("aria-pressed", "false")
    expect(
      screen.queryByRole("button", { name: colors.presets.reset })
    ).toBeNull()

    // L'aperçu, à côté : une page d'accueil en réduction, aux couleurs choisies, pour voir seulement.
    expect(
      screen.getByRole("heading", { name: colors.preview.title })
    ).toBeVisible()
    const preview = document.querySelector("[inert]")
    expect(preview).toHaveTextContent(colors.preview.heading)
    expect(preview?.querySelector('[data-slot="sidebar-inner"]')).toHaveClass(
      "dark"
    )
  })
})
