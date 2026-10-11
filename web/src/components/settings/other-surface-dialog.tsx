import { cn } from "cn"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  otherSurfaceVersion,
  type BrandSurface,
  type PreparedBrandFile,
} from "@/lib/admin-identity"
import { svgDataUrl } from "@/lib/brand-colors"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files.variants

/**
 * La version d'un SVG pour l'autre fond, tirée de lui, sur ce fond (la question des déclinaisons
 * de l'admin, celle de l'autre fond de l'app).
 */
export function OtherSurfacePreview({
  markup,
  surface,
  className,
}: {
  markup: string
  surface: BrandSurface
  // Sa taille.
  className: string
}) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-md p-2",
        surface === "light" ? "bg-brand-light" : "bg-brand-dark",
        className
      )}
    >
      <img
        src={svgDataUrl(markup)}
        alt=""
        className="max-h-full max-w-full object-contain"
      />
    </span>
  )
}

/**
 * Un logo de l'app (sans palettes) en SVG aux couleurs modifiables, envoyé alors que la case de
 * l'autre fond est vide : on propose d'y mettre sa version, tirée de ce fichier, aux mêmes
 * couleurs. « Pas maintenant » enregistre le fichier seul.
 */
export function OtherSurfaceDialog({
  file,
  surface,
  pending,
  onKeep,
  onConfirm,
}: {
  // Le fichier en attente de la réponse ; null : rien à demander.
  file: PreparedBrandFile | null
  // L'autre fond, vide.
  surface: BrandSurface
  pending: boolean
  onKeep: () => void
  onConfirm: () => void
}) {
  const svg = file?.svg ?? null
  const words = labels.otherOnly
  return (
    <AlertDialog
      open={svg !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onKeep()
      }}
    >
      {svg && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{words.title[surface]}</AlertDialogTitle>
            <AlertDialogDescription>{labels.other.hint}</AlertDialogDescription>
          </AlertDialogHeader>
          <OtherSurfacePreview
            markup={otherSurfaceVersion(svg, surface)}
            surface={surface}
            className="h-24"
          />
          <AlertDialogFooter>
            <Button variant="outline" disabled={pending} onClick={onKeep}>
              {words.keep}
            </Button>
            <Button disabled={pending} onClick={onConfirm}>
              {pending && <Spinner />}
              {words.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
