import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as categoriesApi from "@/lib/categories"
import * as api from "@/lib/contents/api"
import * as settingsApi from "@/lib/contents/settings"
import * as templatesApi from "@/lib/contents/templates"
import { renderApp } from "@/test/render"
import { texts } from "@/texts"
import { findRole, queryRole, role } from "@/test/queries"

// L'onglet « Catégories » du Blog et des Podcasts : liste comme celle des contenus, fenêtre pour
// créer ou modifier, suppression définitive ([D28]), une à une ou cochées. Le rangement au clavier
// et à la souris est vérifié par Playwright (web/e2e/sections.spec.ts). La base est simulée.

vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return { ...actual, listContents: vi.fn(async () => []) }
})

vi.mock("@/lib/contents/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof templatesApi>()
  return { ...actual, listStarters: vi.fn(async () => []) }
})

vi.mock("@/lib/contents/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof settingsApi>()
  return { ...actual, removeCategory: vi.fn() }
})

vi.mock("@/lib/categories", async (importOriginal) => {
  const actual = await importOriginal<typeof categoriesApi>()
  return {
    ...actual,
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    deleteCategory: vi.fn(),
    reorderCategories: vi.fn(),
    getCategoryUses: vi.fn(),
  }
})

const labels = texts.categories
const created_at = "2026-09-27T12:30:00Z"
const sommeil = { id: "c1", name: "Sommeil", position: 0, created_at, uses: 3 }
const stress = { id: "c2", name: "Stress", position: 1, created_at, uses: 0 }

/** Ouvre le menu « … » d'une ligne et choisit une action. */
async function chooseAction(name: string, action: string) {
  fireEvent.click(await findRole("button", labels.actions(name)))
  fireEvent.click(await findRole("menuitem", action))
}

beforeEach(() => {
  vi.mocked(categoriesApi.listCategories).mockResolvedValue([sommeil, stress])
})

afterEach(() => vi.clearAllMocks())

describe("Blog : l'onglet Catégories", () => {
  it("un onglet de la page Blog, dans l'adresse, avec ses colonnes et le bouton « Nouvelle catégorie »", async () => {
    const { router } = await renderApp("/blog")
    fireEvent.click(await findRole("tab", labels.tab))

    const table = await screen.findByRole("table")
    expect(router.state.location.search).toBe("?tab=categories")
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    const rows = within(table).getAllByRole("row").slice(1)
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[2].textContent)
    ).toEqual(["Sommeil", "Stress"])
    // « État » : un lien (le nombre dans l'infobulle), ou un lien coupé.
    expect(role("button", labels.uses.open("Sommeil"), rows[0])).toBeVisible()
    expect(role("img", labels.usesCount(0), rows[1])).toBeVisible()
    expect(within(rows[0]).getByText("27 sept. 2026 à 14h30")).toBeVisible()
    expect(role("button", labels.create)).toBeVisible()
    expect(
      queryRole("button", texts.contentList.kinds.article.create)
    ).toBeNull()
    expect(screen.getByText(labels.description.blog)).toBeVisible()
  })

  it("« Nouvelle catégorie » : la fenêtre se ferme à l'enregistrement, la catégorie arrive dans la liste", async () => {
    const respiration = {
      ...stress,
      id: "c3",
      name: "Respiration",
      position: 2,
    }
    vi.mocked(categoriesApi.createCategory).mockImplementation(async () => {
      vi.mocked(categoriesApi.listCategories).mockResolvedValue([
        sommeil,
        stress,
        respiration,
      ])
      return respiration
    })
    await renderApp("/blog?tab=categories")

    fireEvent.click(await findRole("button", labels.create))
    const dialog = await findRole("dialog", labels.dialog.createTitle)
    // Un nom vide est refusé sans rien envoyer.
    fireEvent.click(role("button", texts.common.save, dialog))
    expect(await within(dialog).findByText(labels.nameRequired)).toBeVisible()
    expect(categoriesApi.createCategory).not.toHaveBeenCalled()

    // Un nom déjà porté (majuscules et espaces ignorés) est refusé en tapant.
    fireEvent.change(within(dialog).getByLabelText(labels.name), {
      target: { value: "  SOMMEIL " },
    })
    expect(
      await within(dialog).findByText(labels.errors.nom_en_double)
    ).toBeVisible()
    expect(role("button", texts.common.save, dialog)).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText(labels.name), {
      target: { value: "Respiration" },
    })
    fireEvent.click(role("button", texts.common.save, dialog))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(categoriesApi.createCategory).toHaveBeenCalledWith(
      "blog",
      "Respiration"
    )
    expect(await screen.findByText(labels.added("Respiration"))).toBeVisible()
    expect(await findRole("button", "Respiration")).toBeVisible()
  })

  it("« Modifier » : garder son propre nom est permis, prendre celui d'une autre non", async () => {
    await renderApp("/blog?tab=categories")
    fireEvent.click(await findRole("button", labels.actions("Sommeil")))
    fireEvent.click(await findRole("menuitem", labels.edit))
    const dialog = await findRole("dialog", labels.dialog.editTitle)
    const save = role("button", texts.common.save, dialog)
    expect(save).toBeEnabled()
    fireEvent.change(within(dialog).getByLabelText(labels.name), {
      target: { value: "stress" },
    })
    expect(
      await within(dialog).findByText(labels.errors.nom_en_double)
    ).toBeVisible()
    expect(save).toBeDisabled()
  })

  it("« Modifier » ouvre la même fenêtre, avec le nom", async () => {
    vi.mocked(categoriesApi.renameCategory).mockResolvedValue({
      ...sommeil,
      name: "Bien dormir",
    })
    await renderApp("/blog?tab=categories")

    await chooseAction("Sommeil", labels.edit)
    const dialog = await findRole("dialog", labels.dialog.editTitle)
    const name = within(dialog).getByLabelText(labels.name)
    expect(name).toHaveValue("Sommeil")
    fireEvent.change(name, { target: { value: "Bien dormir" } })
    fireEvent.click(role("button", texts.common.save, dialog))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(categoriesApi.renameCategory).toHaveBeenCalledWith(
      "c1",
      "Bien dormir"
    )
    expect(await screen.findByText(labels.renamed)).toBeVisible()
  })

  it("supprime définitivement une catégorie, après une confirmation qui dit combien de brouillons la perdent", async () => {
    vi.mocked(categoriesApi.deleteCategory).mockResolvedValue()
    await renderApp("/blog?tab=categories")

    await chooseAction("Sommeil", labels.remove)
    const confirm = await findRole("alertdialog", labels.confirmRemove.title)
    expect(confirm).toHaveTextContent(labels.confirmRemove.uses(3))
    fireEvent.click(role("button", labels.confirmRemove.confirm, confirm))

    await waitFor(() =>
      expect(categoriesApi.deleteCategory).toHaveBeenCalledWith("c1")
    )
    expect(await screen.findByText(labels.removed("Sommeil"))).toBeVisible()
  })

  it("cochées : « Supprimer définitivement (n) », une à une", async () => {
    vi.mocked(categoriesApi.deleteCategory).mockResolvedValue()
    await renderApp("/blog?tab=categories")

    fireEvent.click(
      await findRole("checkbox", texts.selection.select("Sommeil"))
    )
    fireEvent.click(role("checkbox", texts.selection.select("Stress")))
    fireEvent.click(role("button", labels.removeMany(2)))
    const confirm = await findRole(
      "alertdialog",
      labels.confirmRemoveMany.title(2)
    )
    fireEvent.click(role("button", labels.confirmRemove.confirm, confirm))

    await waitFor(() =>
      expect(categoriesApi.deleteCategory).toHaveBeenCalledTimes(2)
    )
    expect(await screen.findByText(labels.removedMany(2))).toBeVisible()
  })

  it("« État » ouvre la liste des contenus qui utilisent la catégorie, avec son export", async () => {
    vi.mocked(categoriesApi.getCategoryUses).mockResolvedValue([
      {
        content_id: "a1",
        kind: "article",
        title: "Bien dormir",
        in_draft: true,
        in_app: true,
        in_trash: false,
        live_state: "live",
        scheduled: false,
        writer: null,
      },
      {
        content_id: "a2",
        kind: "article",
        title: "Ancien article",
        in_draft: true,
        in_app: false,
        in_trash: true,
        live_state: "withdrawn",
        scheduled: false,
        writer: null,
      },
    ])
    await renderApp("/blog?tab=categories")

    fireEvent.click(await findRole("button", labels.uses.open("Sommeil")))
    const dialog = await findRole("dialog", labels.uses.title)
    expect(categoriesApi.getCategoryUses).toHaveBeenCalledWith("c1")
    expect(await findRole("link", "Bien dormir", dialog)).toHaveAttribute(
      "href",
      "/blog/a1"
    )
    const trashed = role("row", /Ancien article/, dialog)
    expect(within(trashed).getByText(labels.uses.states.trash)).toBeVisible()
    expect(role("button", texts.uses.export, dialog)).toBeEnabled()
  })

  it("« Retirer » suit l'état de chaque contenu : republié, brouillon seulement, ou indisponible", async () => {
    const use = {
      kind: "article" as const,
      in_draft: true,
      in_app: true,
      in_trash: false,
      scheduled: false,
      writer: null,
    }
    vi.mocked(categoriesApi.getCategoryUses).mockResolvedValue([
      { ...use, content_id: "a1", title: "En ligne", live_state: "live" },
      { ...use, content_id: "a2", title: "Modifié", live_state: "modified" },
      {
        ...use,
        content_id: "a3",
        title: "Programmé",
        live_state: "live",
        scheduled: true,
      },
      {
        ...use,
        content_id: "a4",
        title: "Écrit",
        live_state: "draft",
        in_app: false,
        writer: { id: "u2", name: "Marie" },
      },
    ])
    vi.mocked(settingsApi.removeCategory)
      .mockResolvedValueOnce({ result: "republished" })
      .mockResolvedValueOnce({ result: "draftOnly", publishError: null })
    await renderApp("/blog?tab=categories")

    fireEvent.click(await findRole("button", labels.uses.open("Sommeil")))
    const dialog = await findRole("dialog", labels.uses.title)
    const row = (title: string) => role("row", new RegExp(title), dialog)
    await findRole("link", "En ligne", dialog)
    // L'état, avec ce que fera « Retirer » pour les lecteurs d'écran.
    expect(row("Programmé")).toHaveTextContent(labels.uses.states.scheduled)
    expect(row("Écrit")).toHaveTextContent(labels.uses.tips.writing("Marie"))
    expect(
      role("button", labels.uses.removeFrom("Programmé"), row("Programmé"))
    ).toBeDisabled()
    expect(
      role("checkbox", texts.selection.select("Écrit"), row("Écrit"))
    ).toHaveAttribute("aria-disabled", "true")

    // Tout cocher ne coche que ce qu'on peut retirer.
    fireEvent.click(role("checkbox", texts.selection.selectAll, dialog))
    fireEvent.click(role("button", labels.uses.removeMany(2), dialog))
    const confirm = await findRole("alertdialog", labels.uses.confirm.title(2))
    expect(confirm).toHaveTextContent(labels.uses.confirm.republish(1))
    expect(confirm).toHaveTextContent(labels.uses.confirm.draftOnly(1))
    fireEvent.click(role("button", labels.uses.confirm.confirm, confirm))

    await waitFor(() =>
      expect(settingsApi.removeCategory).toHaveBeenCalledTimes(2)
    )
    expect(vi.mocked(settingsApi.removeCategory).mock.calls[0][0]).toBe("a1")
    expect(vi.mocked(settingsApi.removeCategory).mock.calls[0][1]).toBe("c1")
    expect(
      await screen.findByText(
        [
          labels.uses.done.removed(2),
          labels.uses.done.republished(1),
          labels.uses.done.toRepublish(1),
        ].join(" · ")
      )
    ).toBeVisible()
  })

  it("le filtre par état : utilisées ou non", async () => {
    await renderApp("/blog?tab=categories")

    fireEvent.click(await findRole("combobox", labels.filters.label))
    const unused = await findRole("option", labels.filters.unused)
    fireEvent.pointerDown(unused, { pointerType: "mouse" })
    fireEvent.click(unused)

    expect(await findRole("button", "Stress")).toBeVisible()
    expect(queryRole("button", "Sommeil")).toBeNull()
    expect(screen.getByText(labels.count(1, 2))).toBeVisible()
  })

  it("une recherche filtre les catégories et interdit de ranger", async () => {
    await renderApp("/blog?tab=categories")

    fireEvent.change(await findRole("searchbox", labels.search), {
      target: { value: "som" },
    })

    expect(await screen.findByText(labels.orderFiltering)).toBeVisible()
    expect(role("button", "Sommeil")).toBeVisible()
    expect(queryRole("button", "Stress")).toBeNull()
  })
})
