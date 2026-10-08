import { describe, expect, it } from "vitest"

import type { TrashItem } from "@/lib/media/api"
import { filterTrash, trashFilters, trashTypeLabel } from "@/lib/trash"

const base = {
  title: "Titre",
  deleted_at: "2026-09-27T12:30:00Z",
  deleted_by_name: null,
  purge_at: "2026-10-27T12:30:00Z",
  purge_error: null,
}
const content = (
  id: string,
  kind: "article" | "episode" | "page" | "template",
  title: string | null = "Titre"
): TrashItem => ({ ...base, item_type: "content", id, kind, title })

const photo: TrashItem = { ...base, item_type: "file", id: "f1", kind: "image" }
const page = content("p1", "page")
const article = content("a1", "article")
const template = content("t1", "template")

describe("corbeille", () => {
  it("ne propose que les types présents, toujours dans le même ordre", () => {
    expect(trashFilters([])).toEqual(["all"])
    expect(trashFilters([photo, template, page])).toEqual([
      "all",
      "page",
      "template",
      "file",
    ])
  })

  it("filtre par type", () => {
    const items = [photo, article, page, template]
    expect(filterTrash(items, "article").map((item) => item.id)).toEqual(["a1"])
    expect(filterTrash(items, "file").map((item) => item.id)).toEqual(["f1"])
    expect(filterTrash(items, "all")).toHaveLength(4)
    expect(filterTrash(items, "episode")).toEqual([])
  })

  it("nomme le type", () => {
    expect(trashTypeLabel(photo)).toBe("Fichier · Image")
    expect(trashTypeLabel(template)).toBe("Modèle de bloc")
  })
})
