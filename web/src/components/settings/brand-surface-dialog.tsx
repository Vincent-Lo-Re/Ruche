import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files.variants.surface

/**
 * Un fichier de la marque qui semble fait pour l'autre fond (un logo clair envoyé pour le fond
 * clair, ou l'inverse) : on le dit, et on propose de le mettre dans la case de ce fond.
 */
export function BrandSurfaceDialog({
  fits,
  onMove,
  onKeep,
}: {
  // Le fond pour lequel le fichier semble fait ; null : rien à demander.
  fits: "light" | "dark" | null
  onMove: () => void
  onKeep: () => void
}) {
  return (
    <AlertDialog
      open={fits !== null}
      onOpenChange={(open) => {
        if (!open) onKeep()
      }}
    >
      {fits && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.title[fits]}</AlertDialogTitle>
            <AlertDialogDescription>
              {labels.description[fits]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={onKeep}>
              {labels.keep}
            </Button>
            <Button onClick={onMove}>{labels.move[fits]}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
