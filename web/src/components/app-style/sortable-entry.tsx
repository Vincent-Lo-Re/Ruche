import { Eraser } from "lucide-react"
import type { ReactNode } from "react"

import { DragHandle, SortableList } from "@/components/list-sorting"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSortableItem } from "@/hooks/use-sortable-item"
import { cn } from "cn"
import { texts } from "@/texts"

const labels = texts.appStyle

type Named = { id: string; name: string }

/**
 * Une liste de la charte rangée par glisser-déposer (couleurs, teintes, pastilles, boutons) :
 * chaque élément a sa poignée, son contenu et sa gomme.
 */
export function SortableEntries<T extends Named>({
  items,
  onReorder,
  children,
}: {
  items: readonly T[]
  onReorder: (items: T[]) => void
  children: (item: T, position: number) => ReactNode
}) {
  return (
    <SortableList
      items={[...items]}
      words={labels.dnd}
      onReorder={(ids) =>
        onReorder(
          ids
            .map((id) => items.find((item) => item.id === id))
            .filter((item): item is T => item !== undefined)
        )
      }
    >
      <ul className="grid gap-2">
        {items.map((item, position) => children(item, position))}
      </ul>
    </SortableList>
  )
}

/** Un élément d'une liste rangée : la poignée, le contenu, puis la gomme (ou pourquoi elle est grisée). */
export function SortableEntry({
  item,
  removeBlocked,
  onRemove,
  className,
  children,
}: {
  item: Named
  // La raison qui empêche de retirer l'élément (utilisé, dernier de sa liste), ou null.
  removeBlocked: string | null
  onRemove: () => void
  className?: string
  children: ReactNode
}) {
  const { setNodeRef, isDragging, style, handle } = useSortableItem({
    id: item.id,
    roleDescription: labels.dnd.roleDescription,
  })
  return (
    <li
      ref={setNodeRef}
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={style}
      className={cn(
        "flex items-start gap-2 rounded-lg border bg-card p-2",
        isDragging && "relative z-10 shadow-md",
        className
      )}
    >
      <DragHandle handle={handle} label={labels.handle(item.name)} />
      <div className="min-w-0 flex-1">{children}</div>
      <RemoveButton
        label={labels.remove(item.name)}
        blocked={removeBlocked}
        onRemove={onRemove}
      />
    </li>
  )
}

/** La gomme d'un élément ; grisée, elle dit pourquoi dans son infobulle. */
export function RemoveButton({
  label,
  blocked,
  onRemove,
}: {
  label: string
  blocked: string | null
  onRemove: () => void
}) {
  const button = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-disabled={blocked !== null || undefined}
      className={cn(blocked && "opacity-50")}
      onClick={() => {
        if (!blocked) onRemove()
      }}
    >
      <Eraser aria-hidden />
    </Button>
  )
  if (!blocked) return button
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{blocked}</TooltipContent>
    </Tooltip>
  )
}
