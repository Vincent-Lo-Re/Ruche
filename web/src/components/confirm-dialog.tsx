import { Eraser } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

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

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
  // L'icône du bouton de confirmation (remplacée par l'attente pendant l'action).
  icon?: ReactNode
  // Faux : une action qui ne détruit rien (bouton ordinaire).
  destructive?: boolean
  finalFocus?: ComponentProps<typeof AlertDialogContent>["finalFocus"]
  // Ce qui s'ajoute sous la description (une liste, par exemple).
  children?: ReactNode
}

/**
 * Une confirmation avant d'agir : titre, description, « Annuler » et le bouton de l'action, qui
 * attend la fin de l'action (la fenêtre ne se ferme pas pendant ce temps).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
  icon,
  destructive = true,
  finalFocus,
  children,
}: ConfirmDialogProps) {
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
          {children}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {texts.common.cancel}
            </AlertDialogCancel>
            <Button
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? <Spinner /> : icon}
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}

/** Confirmation d'une mise à la corbeille (une ligne, ou les lignes cochées) : listes de contenus, Modèles de bloc. */
export function TrashDialog(
  props: Omit<ConfirmDialogProps, "icon" | "destructive">
) {
  return <ConfirmDialog {...props} icon={<Eraser />} />
}
