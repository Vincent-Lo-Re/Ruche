import { cn } from "cn"
import { useRef, useState, type Ref } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Un titre (ou un nom) sur une ligne, coupé par « … » s'il est trop long : il s'affiche alors en
 * entier dans une infobulle (jamais quand il tient en entier). as : l'élément, un titre h2 au
 * départ (qui peut recevoir le focus), ou un paragraphe, ou un morceau de ligne.
 */
export function TruncatedText({
  text,
  id,
  className,
  as = "h2",
}: {
  text: string
  id?: string
  className?: string
  as?: "h2" | "p" | "span"
}) {
  const ref = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const cut = () => {
    const element = ref.current
    return element !== null && element.scrollWidth > element.clientWidth
  }
  return (
    <Tooltip open={open} onOpenChange={(next) => setOpen(next && cut())}>
      <TooltipTrigger
        render={
          as === "h2" ? (
            <h2
              ref={ref as Ref<HTMLHeadingElement>}
              id={id}
              // Reçoit le focus quand la glissière du bloc se ferme.
              tabIndex={-1}
              className={cn("min-w-0 truncate", className)}
            />
          ) : as === "p" ? (
            <p
              ref={ref as Ref<HTMLParagraphElement>}
              id={id}
              className={cn("min-w-0 truncate", className)}
            />
          ) : (
            <span
              ref={ref}
              id={id}
              className={cn("min-w-0 truncate", className)}
            />
          )
        }
      >
        {text}
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
