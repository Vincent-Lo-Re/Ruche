import { cn } from "cn"
import type { ComponentProps } from "react"

import { DragHandle } from "@/components/list-sorting"
import { TableCell, TableRow } from "@/components/ui/table"
import { useSortableItem } from "@/hooks/use-sortable-item"
import { texts } from "@/texts"

const labels = texts.contentList.order

/** Une ligne déplaçable : sa poignée en première cellule, puis ses cellules. */
export function SortableRow({
  id,
  name,
  disabled,
  className,
  children,
  ...props
}: ComponentProps<typeof TableRow> & {
  id: string
  name: string
  disabled: boolean
}) {
  const { setNodeRef, isDragging, style, handle } = useSortableItem({
    id,
    disabled,
    roleDescription: labels.dnd.roleDescription,
  })
  return (
    <TableRow
      ref={setNodeRef}
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={style}
      className={cn(
        isDragging && "relative z-10 bg-background shadow-md",
        className
      )}
      {...props}
    >
      <TableCell className="w-0 pr-0">
        <DragHandle
          handle={handle}
          label={labels.handle(name)}
          disabled={disabled}
        />
      </TableCell>
      {children}
    </TableRow>
  )
}
