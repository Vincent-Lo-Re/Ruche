import { cn } from "cn"
import { Eraser } from "lucide-react"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Le champ de fichier caché qu'ouvre un bouton ou une case : il rend les fichiers choisis, puis
 * se vide (le même fichier choisi deux fois est encore reçu).
 */
export function HiddenFileInput({
  onFiles,
  ...props
}: Omit<ComponentProps<"input">, "type" | "onChange" | "className"> & {
  onFiles: (files: FileList | null) => void
}) {
  return (
    <input
      {...props}
      type="file"
      className="sr-only"
      onChange={(event) => {
        onFiles(event.target.files)
        event.target.value = ""
      }}
    />
  )
}

/**
 * La gomme en haut à droite d'un aperçu (logo, image de connexion) : visible au survol de
 * l'aperçu (className donne le groupe, « group-hover/slot:opacity-100 ») ou au clavier, son sens
 * dans l'infobulle. Un fond plein sous le rouge pâle : l'icône se voit sur n'importe quelle image.
 */
export function RemoveFileButton({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="destructive"
            size="icon-sm"
            className={cn(
              "absolute top-2 right-2 bg-background opacity-0 transition-opacity focus-visible:opacity-100",
              className
            )}
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        <Eraser />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
