import { FunctionsHttpError } from "@supabase/supabase-js"
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { profileQueryKey } from "@/auth/auth-context"
import { teamQueryKey, type Member } from "@/lib/team"
import { supabase } from "@/lib/supabase"
import { fakeAuth, renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"
import { findRole, queryRole, role } from "@/test/queries"

afterEach(() => vi.restoreAllMocks())

const me: Member = {
  ...testProfile,
  created_at: "2026-09-01T08:00:00Z",
  status: "active",
  invited_at: null,
  last_sign_in_at: "2026-09-27T12:30:00Z",
  mfa_enabled: true,
  mfa_enabled_at: "2026-09-01T08:05:00Z",
}

const invited: Member = {
  id: "00000000-0000-4000-8000-000000000002",
  email: "nina@exemple.test",
  full_name: null,
  role: "editor",
  created_at: "2026-09-26T08:00:00Z",
  status: "invited",
  invited_at: "2026-09-26T08:00:00Z",
  last_sign_in_at: null,
  mfa_enabled: false,
  mfa_enabled_at: null,
}

type InvokeResult = Awaited<ReturnType<typeof supabase.functions.invoke>>

/** Réponse d'erreur de la fonction « equipe ». */
function teamFailure(code: string, status: number): InvokeResult {
  return {
    data: null,
    error: new FunctionsHttpError(
      new Response(JSON.stringify({ error: { code, message: "…" } }), {
        status,
      })
    ),
    response: undefined,
  }
}

let listFails = false

/** Simule la fonction « equipe » : la liste, puis les réponses données. */
function mockTeam(...responses: InvokeResult[]) {
  listFails = false
  // supabase.functions crée un nouveau client à chaque lecture : on remplace sa méthode commune.
  const functionsClient = Object.getPrototypeOf(supabase.functions) as {
    invoke: typeof supabase.functions.invoke
  }
  const invoke = vi.spyOn(functionsClient, "invoke")
  const queue = [...responses]
  invoke.mockImplementation(async (_name, options) => {
    const body = options?.body as { action: string }
    if (body.action === "list") {
      if (listFails) return teamFailure("erreur_serveur", 500)
      return {
        data: { members: [me, invited] },
        error: null,
        response: undefined,
      }
    }
    return (
      queue.shift() ?? { data: { ok: true }, error: null, response: undefined }
    )
  })
  return invoke
}

describe("La team", () => {
  it("liste les membres avec leur état", async () => {
    mockTeam()
    await renderApp("/team")

    const nina = (await screen.findByText(invited.email)).closest("tr")!
    expect(within(nina).getByText(texts.team.noName)).toBeVisible()
    expect(within(nina).getByText(texts.team.never)).toBeVisible()
    expect(within(nina).getByText(texts.team.mfaOff)).toBeVisible()

    const anne = screen.getByText(me.email).closest("tr")!
    expect(within(anne).getByText(texts.team.you)).toBeVisible()
    expect(within(anne).getByText("27 sept. 2026 à 14h30")).toBeVisible()
    expect(within(anne).getByText(texts.team.mfaOn)).toBeVisible()
  })

  it("met en avant le renvoi d'une invitation expirée", async () => {
    const invoke = mockTeam()
    await renderApp("/team")

    // Invitée la veille : le lien (10 minutes) a expiré.
    const nina = (await screen.findByText(invited.email)).closest("tr")!
    expect(within(nina).getByText(texts.team.status.expired)).toBeVisible()
    fireEvent.click(role("button", texts.team.actions.resend, nina))

    expect(await screen.findByText(texts.team.done.resent)).toBeVisible()
    expect(invoke).toHaveBeenCalledWith("equipe", {
      body: { action: "resend", user_id: invited.id },
    })
  })

  it("ne propose aucune action sur son propre compte", async () => {
    mockTeam()
    await renderApp("/team")

    const nina = (await screen.findByText(invited.email)).closest("tr")!
    expect(
      role("button", texts.team.actions.open(invited.email), nina)
    ).toBeVisible()
    const anne = screen.getByText(me.email).closest("tr")!
    expect(within(anne).queryByRole("button")).toBeNull()
  })

  it("un éditeur voit la team en lecture seule : ni invitation, ni renvoi, ni actions", async () => {
    mockTeam()
    await renderApp("/team", fakeAuth({ role: "editor" }))

    const nina = (await screen.findByText(invited.email)).closest("tr")!
    expect(within(nina).getByText(texts.team.status.expired)).toBeVisible()
    expect(within(nina).queryByRole("button")).toBeNull()
    expect(queryRole("button", texts.team.invite)).toBeNull()
    expect(screen.queryByText(texts.team.singleAdmin)).toBeNull()
  })

  it("conseille un deuxième admin quand il n'y en a qu'un", async () => {
    mockTeam()
    await renderApp("/team")

    expect(await screen.findByText(texts.team.singleAdmin)).toBeVisible()
  })

  it("garde la liste si une mise à jour échoue", async () => {
    mockTeam()
    const { queryClient } = await renderApp("/team")
    await screen.findByText(invited.email)

    listFails = true
    await act(() => queryClient.refetchQueries({ queryKey: teamQueryKey }))

    expect(await screen.findByText(texts.team.refreshFailed)).toBeVisible()
    expect(screen.getByText(invited.email)).toBeVisible()
    expect(
      screen.queryByText(texts.team.loadFailed, { exact: false })
    ).toBeNull()
  })

  it("remplace la liste par l'erreur si rien n'a pu être chargé", async () => {
    mockTeam()
    listFails = true
    await renderApp("/team")

    expect(
      await screen.findByText(texts.team.loadFailed, { exact: false })
    ).toBeVisible()
    expect(role("button", texts.common.retry)).toBeVisible()
  })

  it("relit sa fiche quand la fonction répond « réservé aux admins »", async () => {
    mockTeam(teamFailure("reserve_aux_admins", 403))
    const { queryClient } = await renderApp("/team")
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    const nina = (await screen.findByText(invited.email)).closest("tr")!
    fireEvent.click(role("button", texts.team.actions.resend, nina))

    expect(
      await screen.findByText(texts.team.errors.reserve_aux_admins)
    ).toBeVisible()
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: profileQueryKey(me.id),
    })
  })

  it("vérifie l'adresse de la personne invitée", async () => {
    const invoke = mockTeam()
    await renderApp("/team")

    fireEvent.click(await findRole("button", texts.team.invite))
    fireEvent.change(await screen.findByLabelText(texts.team.email), {
      target: { value: "pas-une-adresse" },
    })
    fireEvent.click(role("button", texts.team.sendInvitation))

    expect(await screen.findByText(texts.team.invalidEmail)).toBeVisible()
    expect(invoke).toHaveBeenCalledTimes(1) // la liste seulement
  })

  it("invite un membre, affiche l'erreur de la fonction et relit la liste", async () => {
    const invoke = mockTeam(teamFailure("deja_membre", 409))
    await renderApp("/team")

    fireEvent.click(await findRole("button", texts.team.invite))
    fireEvent.change(await screen.findByLabelText(texts.team.email), {
      target: { value: "Nina@Exemple.test" },
    })
    fireEvent.click(role("button", texts.team.sendInvitation))

    expect(await screen.findByText(texts.team.errors.deja_membre)).toBeVisible()
    expect(invoke).toHaveBeenCalledWith("equipe", {
      body: {
        action: "invite",
        email: "nina@exemple.test",
        full_name: "",
        role: "editor",
        language: "fr",
      },
    })
    // La liste est relue même après un échec : elle montre l'état réel.
    await waitFor(() =>
      expect(
        invoke.mock.calls.filter(
          ([, options]) =>
            (options?.body as { action: string }).action === "list"
        )
      ).toHaveLength(2)
    )
  })
})
