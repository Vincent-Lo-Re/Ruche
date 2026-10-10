import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Draft } from "@/blocks/types"
import * as levelsApi from "@/lib/access-levels"
import * as api from "@/lib/contents/api"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import { createFromDialog } from "@/test/new-content"
import { renderApp } from "@/test/render"
import { texts } from "@/texts"
import { findRole, queryRole, role } from "@/test/queries"

// La section Modèles (étape 6) et « Nouvelle page » avec les points de départ ([D42]). La base
// est simulée.

vi.mock("@/lib/contents/api", async (original) =>
  (await import("@/test/mocks")).contentsApi(original)
)

vi.mock("@/lib/contents/publication", async (original) =>
  (await import("@/test/mocks")).publicationApi(original)
)

vi.mock("@/lib/contents/templates", async (original) =>
  (await import("@/test/mocks")).templatesApi(original)
)

// Les formules, lues par l'éditeur d'un modèle ou d'une page.
vi.mock("@/lib/access-levels", async (importOriginal) => {
  const actual = await importOriginal<typeof levelsApi>()
  return { ...actual, listAccessLevels: vi.fn(async () => []) }
})

vi.mock("@/lib/media/api", async (original) =>
  (await import("@/test/mocks")).mediaApi(original)
)

const CONTACT = "00000000-0000-4000-8000-0000000000c1"
const RETENIR = "00000000-0000-4000-8000-0000000000c2"
const INTERVIEW = "00000000-0000-4000-8000-0000000000c3"
const PAGE_ID = "00000000-0000-4000-8000-0000000000aa"

function draftOf(title: string): Draft {
  return { v: 1, title, blocks: [] }
}

function item(
  id: string,
  title: string,
  sort: templatesApi.TemplateSort,
  changes: Partial<templatesApi.TemplateItem> = {}
): templatesApi.TemplateItem {
  return {
    id,
    title,
    sort,
    templateFor: sort === "starter" ? "page" : null,
    draft: draftOf(title),
    draft_saved_at: "2026-09-27T12:30:00Z",
    ...changes,
  }
}

function use(
  id: string,
  title: string,
  templateIds: string[],
  inTrash = false
): templatesApi.TemplateUse {
  return { id, kind: "page", title, inTrash, templateIds }
}

const created: api.Content = {
  id: CONTACT,
  kind: "template",
  title: "Contact",
  draft: { ...draftOf("Contact"), cover: null, audio: null },
  draft_rev: 1,
  draft_saved_at: "2026-09-27T12:30:00Z",
  deleted_at: null,
  access_chosen: false,
  access_level_id: null,
  slug: null,
  template_sort: "shared",
  template_for: null,
  category_ids: [],
}

beforeEach(() => {
  vi.mocked(templatesApi.listTemplates).mockResolvedValue([
    item(RETENIR, "À retenir", "style"),
    item(CONTACT, "Contact", "shared"),
    item(INTERVIEW, "Interview", "starter"),
  ])
  vi.mocked(templatesApi.listTemplateUses).mockImplementation(async (ids) =>
    ids
      ? []
      : [
          use(PAGE_ID, "Accueil", [CONTACT]),
          use("p2", "Ancienne", [CONTACT], true),
        ]
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

const labels = texts.templates.list

describe("section Modèles", () => {
  it("montre tous les modèles avec leur type, puis un onglet par sorte", async () => {
    const sorts = texts.templates.sorts
    await renderApp("/templates")

    // « Tous les blocs » : chaque modèle, avec sa sorte, et la date seule.
    expect(
      await screen.findByRole("tab", { name: labels.tabs.all, selected: true })
    ).toBeInTheDocument()
    const row = role("link", "Contact").closest("tr")!
    expect(row).toHaveTextContent(sorts.shared.title)
    expect(row).toHaveTextContent("27 sept. 2026 à 14h30")
    expect(row).not.toHaveTextContent("Anne Admin")
    expect(role("link", "Contact")).toHaveAttribute(
      "href",
      `/templates/${CONTACT}`
    )
    expect(
      screen.getAllByRole("link", { name: /À retenir|Interview/ })
    ).toHaveLength(2)

    // Un onglet par sorte : ses modèles seulement, sans la colonne Type.
    fireEvent.click(role("tab", sorts.starter.tab))
    const panel = await screen.findByRole("tabpanel")
    expect(
      within(panel).getByText(sorts.starter.description, { exact: false })
    ).toBeVisible()
    expect(role("link", "Interview", panel)).toBeVisible()
    expect(queryRole("link", "Contact", panel)).toBeNull()
    expect(queryRole("columnheader", labels.columns.type, panel)).toBeNull()
  })

  it("l'onglet est dans l'adresse (QCM du 05/10/2026)", async () => {
    const sorts = texts.templates.sorts
    const { router } = await renderApp("/templates?tab=starter")
    expect(
      await screen.findByRole("tab", {
        name: sorts.starter.tab,
        selected: true,
      })
    ).toBeInTheDocument()
    fireEvent.click(role("tab", sorts.shared.tab))
    await waitFor(() =>
      expect(router.state.location.search).toBe("?tab=shared")
    )
  })

  it("« Nouveau modèle » : nom et sorte, puis l'éditeur du modèle s'ouvre", async () => {
    vi.mocked(templatesApi.createTemplate).mockResolvedValue(created)
    const { router } = await renderApp("/templates")
    fireEvent.click(await findRole("button", labels.create))
    const dialog = await findRole("dialog", texts.templates.create.title)
    fireEvent.change(
      within(dialog).getByLabelText(texts.templates.create.name),
      {
        target: { value: "  Contact  " },
      }
    )
    fireEvent.click(
      role("radio", new RegExp(texts.templates.sorts.shared.title), dialog)
    )
    fireEvent.click(role("button", texts.templates.create.submit, dialog))
    await waitFor(() =>
      expect(templatesApi.createTemplate).toHaveBeenCalledWith({
        name: "Contact",
        sort: "shared",
        templateFor: null,
      })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/templates/${CONTACT}`)
    )
  })

  it("« Nouveau modèle » : un nom déjà porté par un autre modèle bloque la création", async () => {
    vi.mocked(api.findContentByTitle).mockImplementation(
      async (_kind, value) =>
        value.toLowerCase() === "contact"
          ? { id: "autre", title: "Contact" }
          : null
    )
    await renderApp("/templates")
    fireEvent.click(await findRole("button", labels.create))
    const dialog = await findRole("dialog", texts.templates.create.title)
    fireEvent.change(
      within(dialog).getByLabelText(texts.templates.create.name),
      { target: { value: "CONTACT" } }
    )
    expect(
      await within(dialog).findByText(texts.templates.create.nameTaken)
    ).toBeVisible()
    expect(api.findContentByTitle).toHaveBeenLastCalledWith(
      "template",
      "CONTACT",
      null
    )
    expect(role("button", texts.templates.create.submit, dialog)).toBeDisabled()
    expect(templatesApi.createTemplate).not.toHaveBeenCalled()
  })

  it("un point de départ a une section (Pages par défaut)", async () => {
    vi.mocked(templatesApi.createTemplate).mockResolvedValue({
      ...created,
      template_sort: "starter",
      template_for: "page",
    })
    await renderApp("/templates")
    fireEvent.click(await findRole("button", labels.create))
    const dialog = await findRole("dialog", texts.templates.create.title)
    expect(
      within(dialog).queryByLabelText(texts.templates.create.section)
    ).toBeNull()
    fireEvent.change(
      within(dialog).getByLabelText(texts.templates.create.name),
      {
        target: { value: "Interview" },
      }
    )
    fireEvent.click(
      role("radio", new RegExp(texts.templates.sorts.starter.title), dialog)
    )
    expect(
      await within(dialog).findByText(texts.templates.create.sectionHint)
    ).toBeInTheDocument()
    fireEvent.click(role("button", texts.templates.create.submit, dialog))
    await waitFor(() =>
      expect(templatesApi.createTemplate).toHaveBeenCalledWith({
        name: "Interview",
        sort: "starter",
        templateFor: "page",
      })
    )
  })

  it("un bloc identique partout utilisé : ses brouillons, « Détacher partout », puis la corbeille", async () => {
    let detached = false
    vi.mocked(templatesApi.listTemplateUses).mockImplementation(async (ids) =>
      ids && !detached
        ? [
            use(PAGE_ID, "Accueil", [CONTACT]),
            use("p2", "Ancienne", [CONTACT], true),
          ]
        : []
    )
    vi.mocked(templatesApi.detachTemplateEverywhere).mockImplementation(
      async () => {
        detached = true
        return 2
      }
    )
    vi.mocked(publicationApi.trashContent).mockResolvedValue({
      needsFileSync: false,
    })
    await renderApp("/templates")
    fireEvent.click(await findRole("button", labels.actions("Contact")))
    fireEvent.click(await findRole("menuitem", labels.trash))

    const dialog = await findRole("alertdialog", labels.used.title)
    expect(role("link", "Accueil", dialog)).toHaveAttribute(
      "href",
      `/pages/${PAGE_ID}`
    )
    // Dans la corbeille : pas de lien, mais nommé.
    // Une ligne par brouillon (l'Item de shadcn) : le nom, puis la sorte et la corbeille.
    expect(
      within(dialog)
        .getByText(/Ancienne/)
        .closest("[data-template-use]")
    ).toHaveTextContent(labels.used.inTrash)
    expect(queryRole("button", labels.confirmTrash.confirm, dialog)).toBeNull()
    fireEvent.click(role("button", labels.used.detachAll, dialog))
    await waitFor(() =>
      expect(templatesApi.detachTemplateEverywhere).toHaveBeenCalledWith(
        CONTACT
      )
    )
    expect(await screen.findByText(labels.used.detached(2))).toBeInTheDocument()

    const confirm = await findRole("alertdialog", labels.confirmTrash.title)
    fireEvent.click(role("button", labels.confirmTrash.confirm, confirm))
    await waitFor(() =>
      expect(publicationApi.trashContent).toHaveBeenCalledWith(CONTACT)
    )
    expect(await screen.findByText(labels.trashed("Contact"))).toBeVisible()
  })

  it("une mise en forme se supprime après une simple confirmation, avec « Annuler »", async () => {
    vi.mocked(publicationApi.trashContent).mockResolvedValue({
      needsFileSync: false,
    })
    vi.mocked(publicationApi.restoreContent).mockResolvedValue({
      restored: 1,
      addressRemoved: false,
      renamedTo: null,
    })
    await renderApp("/templates")
    fireEvent.click(await findRole("button", labels.actions("À retenir")))
    fireEvent.click(await findRole("menuitem", labels.trash))
    const dialog = await findRole("alertdialog", labels.confirmTrash.title)
    expect(dialog).toHaveTextContent(
      labels.confirmTrash.description("À retenir")
    )
    fireEvent.click(role("button", labels.confirmTrash.confirm, dialog))
    await waitFor(() =>
      expect(publicationApi.trashContent).toHaveBeenCalledWith(RETENIR)
    )
    // Seul un bloc identique partout a besoin de la liste de ses brouillons.
    expect(templatesApi.listTemplateUses).not.toHaveBeenCalledWith([RETENIR])
    const toast = await screen.findByText(labels.trashed("À retenir"))
    fireEvent.click(role("button", texts.common.undo, toast.closest("li")!))
    await waitFor(() =>
      expect(publicationApi.restoreContent).toHaveBeenCalledWith(RETENIR)
    )
  })

  it("« Tout sélectionner » met les modèles à la corbeille, et garde un bloc identique partout utilisé", async () => {
    const used = "Ce modèle est utilisé dans : Accueil."
    vi.mocked(publicationApi.trashContent).mockImplementation(async (id) => {
      if (id === CONTACT) {
        throw new api.ContentError("modele_utilise", { detail: used })
      }
      return { needsFileSync: false }
    })
    vi.mocked(publicationApi.restoreContent).mockResolvedValue({
      restored: 1,
      addressRemoved: false,
      renamedTo: null,
    })
    await renderApp("/templates")

    fireEvent.click(await findRole("checkbox", texts.selection.selectAll))
    expect(role("button", texts.selection.trash(3))).toBeVisible()
    fireEvent.click(role("button", texts.selection.trash(3)))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(labels.confirmTrashManyTitle(3))
    fireEvent.click(role("button", labels.confirmTrash.confirm, dialog))

    expect(await screen.findByText(labels.trashedMany(2))).toBeVisible()
    expect(screen.getByText(labels.keptTitle(1))).toBeVisible()
    expect(
      screen.getByText(texts.selection.keptItem("Contact", used))
    ).toBeVisible()
    expect(role("checkbox", texts.selection.select("Contact"))).toBeChecked()

    fireEvent.click(
      role(
        "button",
        texts.common.undo,
        screen.getByText(labels.trashedMany(2)).closest("li")!
      )
    )
    expect(await screen.findByText(labels.restoredMany(2))).toBeVisible()
  })
})

describe("Modèles de bloc : où ils servent", () => {
  it("la colonne « État », l'onglet « Non utilisés », et la fenêtre des copies avec son export", async () => {
    vi.mocked(templatesApi.templateUsage).mockResolvedValue(
      new Map([
        [CONTACT, 2],
        [RETENIR, 1],
      ])
    )
    vi.mocked(templatesApi.getTemplateUses).mockResolvedValue([
      {
        content_id: "a1",
        kind: "article",
        title: "Bien dormir",
        in_draft: false,
        in_app: false,
        in_trash: false,
        copied: true,
      },
    ])
    const { router } = await renderApp("/templates")

    // « Interview » (point de départ) ne sert nulle part : un lien coupé.
    const interview = (await findRole("link", "Interview")).closest("tr")!
    expect(await findRole("img", labels.usesCount(0), interview)).toBeVisible()

    // « À retenir » (mise en forme) a été copiée : la fenêtre le dit, avec l'export.
    fireEvent.click(await findRole("button", labels.uses.open("À retenir")))
    const dialog = await findRole("dialog", labels.uses.title)
    expect(templatesApi.getTemplateUses).toHaveBeenCalledWith(
      expect.objectContaining({ id: RETENIR, sort: "style" })
    )
    expect(await findRole("link", "Bien dormir", dialog)).toHaveAttribute(
      "href",
      "/blog/a1"
    )
    expect(within(dialog).getByText(texts.uses.copied)).toBeVisible()
    expect(role("button", texts.uses.export, dialog)).toBeEnabled()
    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    // L'onglet « Non utilisés » : seulement « Interview », et dans l'adresse.
    fireEvent.click(role("tab", labels.tabs.unused))
    expect(router.state.location.search).toBe("?tab=unused")
    const panel = await screen.findByRole("tabpanel")
    expect(within(panel).getByText(labels.unusedDescription)).toBeVisible()
    expect(role("link", "Interview", panel)).toBeVisible()
    expect(queryRole("link", "Contact", panel)).toBeNull()
    expect(queryRole("link", "À retenir", panel)).toBeNull()
  })
})

describe("« Nouvelle page » et les points de départ ([D42])", () => {
  it("la fenêtre propose « Page vide » ou un point de départ des Pages", async () => {
    vi.mocked(templatesApi.listStarters).mockResolvedValue([
      { id: INTERVIEW, title: "Interview" },
    ])
    vi.mocked(api.createContent).mockResolvedValue({
      ...created,
      id: PAGE_ID,
      kind: "page",
      template_sort: null,
    })
    const { router } = await renderApp("/pages")
    // Les points de départ lus, la fenêtre de « Nouvelle page » propose « Page vide » ou l'un
    // d'eux.
    await waitFor(() =>
      expect(templatesApi.listStarters).toHaveBeenCalledWith("page")
    )
    await createFromDialog("page", "Rencontre", "Interview")
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "page",
        "Rencontre",
        INTERVIEW
      )
    )
    expect(templatesApi.listStarters).toHaveBeenCalledWith("page")
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/pages/${PAGE_ID}`)
    )
  })
})
