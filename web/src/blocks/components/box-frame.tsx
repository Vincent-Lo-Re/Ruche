import type { CSSProperties, ReactNode } from "react"

import { useBlocksStyle } from "@/blocks/components/style-context"
import type { BoxBlock } from "@/blocks/types"
import { tintVariables } from "@/lib/app-style/variables"

/**
 * Le cadre d'un encadré : fond ou bordure (look), aux couleurs de sa teinte de la charte. Sans
 * teinte choisie, celles de la première, posées sur le téléphone.
 */
export function BoxFrame({
  block,
  children,
}: {
  block: Pick<BoxBlock, "look" | "tint">
  children: ReactNode
}) {
  const shown = useBlocksStyle()
  const tint =
    shown && block.tint
      ? (tintVariables(shown.style, shown.mode, block.tint) as CSSProperties)
      : undefined
  return (
    <div
      className="blocks-box"
      data-look={block.look}
      // eslint-disable-next-line no-restricted-syntax -- les couleurs de la teinte, choisies dans la charte de l'app
      style={tint}
    >
      {children}
    </div>
  )
}
