// Corbeille commune (fichiers et contenus) : filtre par type, libellés. Sans React.

import type { TrashItem } from "@/lib/media/api"
import { isMediaKind } from "@/lib/media/constants"
import { texts } from "@/texts"

// Filtre par type, dans l'ordre du menu : Blog, Podcasts, Pages, Modèles de bloc,
// Médiathèque.
const trashFilterOrder = [
  "article",
  "episode",
  "page",
  "template",
  "file",
] as const

type TrashType = (typeof trashFilterOrder)[number]
export type TrashFilter = "all" | TrashType

/** Le type d'un élément pour le filtre. */
function trashTypeOf(item: TrashItem): TrashType {
  if (item.item_type === "file") return "file"
  return item.kind
}

/** « Tout », puis seulement les types présents dans la corbeille, toujours dans le même ordre. */
export function trashFilters(items: TrashItem[]): TrashFilter[] {
  const present = new Set(items.map(trashTypeOf))
  return ["all", ...trashFilterOrder.filter((type) => present.has(type))]
}

export function filterTrash(
  items: TrashItem[],
  filter: TrashFilter
): TrashItem[] {
  if (filter === "all") return items
  return items.filter((item) => trashTypeOf(item) === filter)
}

/** Le type affiché : « Fichier · Image », « Page », « Article »… */
export function trashTypeLabel(item: TrashItem): string {
  if (item.item_type === "file") {
    const type = texts.trash.itemTypes.file
    return isMediaKind(item.kind)
      ? `${type} · ${texts.media.kinds[item.kind]}`
      : type
  }
  return texts.trash.contentKinds[item.kind]
}
