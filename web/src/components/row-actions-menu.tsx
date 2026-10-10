import { Ellipsis } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Le menu « … » d'une ligne de liste : le bouton (son nom dit la ligne, « Actions pour … ») et
 * les actions de la ligne, alignées sur sa droite. width : la largeur du menu (w-44 au départ).
 */
export function RowActionsMenu({
  label,
  disabled,
  width = "w-44",
  children,
  ...trigger
}: {
  label: string
  disabled?: boolean
  width?: string
  children: ReactNode
  // Un repère pour retrouver le bouton (data-row-menu : le focus y revient).
  [data: `data-${string}`]: unknown
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...trigger}
        disabled={disabled}
        aria-label={label}
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={width}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
