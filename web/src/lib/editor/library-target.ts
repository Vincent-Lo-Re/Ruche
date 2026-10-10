/**
 * Éditeur des contenus (docs/ADMINISTRATION.md, § 4) : ajouter un bloc ouvre les Blocs. Ils ajoutent
 * sous le bloc choisi, ou, après « Ajouter dans l'encadré », à la fin de cet encadré. Sans React.
 */

import { findBlock } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"

// Le premier bloc des Blocs : il reçoit le curseur quand un « Ajouter » les ouvre.
export const LIBRARY_FIRST_ID = "blocs-premier"

/**
 * L'encadré où les Blocs ajouteront, encore valable : il existe et c'est toujours le bloc
 * choisi. Sinon null (les Blocs ajoutent alors sous le bloc choisi).
 */
export function liveBoxTarget(
  draft: Draft,
  boxId: string | null,
  selectedId: string | null
): string | null {
  if (!boxId || boxId !== selectedId) return null
  return findBlock(draft, boxId)?.block.type === "box" ? boxId : null
}
