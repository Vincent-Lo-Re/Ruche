import { useSortable, type UseSortableArguments } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

/**
 * Un élément d'une liste rangée par glisser-déposer (dnd-kit) : useSortable, avec l'annonce de
 * son rôle pour les lecteurs d'écran et sa position pendant le glisser-déposer, prête à poser en
 * style. Les listes de contenus, les Formules et le plan de l'éditeur.
 */
export function useSortableItem({
  roleDescription,
  ...options
}: Omit<UseSortableArguments, "attributes"> & { roleDescription: string }) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ ...options, attributes: { roleDescription } })
  return {
    setNodeRef,
    isDragging,
    style: { transform: CSS.Translate.toString(transform), transition },
    // Ce que reçoit la poignée (DragHandle de list-sorting.tsx, ou celle du plan).
    handle: { ref: setActivatorNodeRef, ...attributes, ...listeners },
  }
}
