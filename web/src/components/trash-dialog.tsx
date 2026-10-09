import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { texts } from "@/texts"

/**
 * Confirmation d'une mise à la corbeille (une ligne, ou les lignes cochées : listes de contenus,
 * Modèles de bloc) ou d'un retrait définitif (une formule, une catégorie, une langue de l'app).
 */
export function TrashDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
  finalFocus,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
  // Faux : le focus est placé ailleurs après la confirmation (la liste relue).
  finalFocus?: () => boolean
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel()
      }}
    >
      {open && (
        <AlertDialogContent finalFocus={finalFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {texts.common.cancel}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? <Spinner /> : <Trash2 />}
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
