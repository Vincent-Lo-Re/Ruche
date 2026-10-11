import { cn } from "cn"

import { OtherSurfacePreview } from "@/components/settings/other-surface-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import {
  brandVariants,
  otherSurfaceVersion,
  variantPresets,
  type PreparedBrandFile,
} from "@/lib/admin-identity"
import { svgDataUrl } from "@/lib/brand-colors"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files.variants

/** Une pastille de la couleur détectée (une image : la couleur vient du fichier). */
function swatch(color: string) {
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="${color}"/></svg>`
  )
}

/**
 * La question posée après l'envoi d'un SVG aux couleurs modifiables (ADMIN § 7) : les couleurs
 * détectées, puis le logo décliné pour chaque palette, sur fond clair et sur fond sombre ;
 * « Décliner » les enregistre toutes, « Garder tel quel » enregistre le fichier seul. Si la case de
 * l'autre fond est vide, une case à cocher (cochée au départ) propose d'y mettre sa version, tirée
 * de ce fichier, dans les deux cas.
 */
export function BrandVariantsDialog({
  file,
  pending,
  other,
  onOtherChange,
  onKeep,
  onConfirm,
}: {
  file: PreparedBrandFile | null
  pending: boolean
  // L'autre fond, vide (null : il a déjà son fichier), et si sa version est demandée.
  other: { surface: "light" | "dark"; checked: boolean } | null
  onOtherChange: (checked: boolean) => void
  onKeep: () => void
  onConfirm: () => void
}) {
  const svg = file?.svg ?? null
  const count = variantPresets.length
  const detected = svg
    ? ([
        [labels.main, svg.colors.main],
        [labels.accent, svg.colors.accent],
      ] as const)
    : []
  return (
    <Dialog
      open={svg !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onKeep()
      }}
    >
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>
            {labels.description(
              count,
              texts.colors.presets.names["neutral-none"]
            )}
          </DialogDescription>
        </DialogHeader>
        {svg && (
          <>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{labels.detected}</span>
              {detected.map(
                ([name, color]) =>
                  color && (
                    <span key={name} className="flex items-center gap-1.5">
                      <img
                        src={swatch(color)}
                        alt=""
                        className="size-4 rounded-full ring-1 ring-foreground/10"
                      />
                      {name}
                    </span>
                  )
              )}
            </div>
            <ul className="grid max-h-96 gap-3 overflow-y-auto sm:grid-cols-2">
              {brandVariants(svg).map((variant) => (
                <li
                  key={variant.palette}
                  className="space-y-1.5 rounded-lg p-2 ring-1 ring-foreground/10"
                >
                  <p className="text-xs font-medium">
                    {texts.colors.presets.names[variant.palette]}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["light", "dark"] as const).map((surface) => (
                      <div
                        key={surface}
                        className={cn(
                          "flex h-14 items-center justify-center rounded-md p-2",
                          surface === "light"
                            ? "bg-brand-light"
                            : "bg-brand-dark"
                        )}
                      >
                        <img
                          src={svgDataUrl(variant[surface])}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            {other && (
              <label className="flex items-center gap-3 rounded-lg p-2 ring-1 ring-foreground/10">
                <Checkbox
                  checked={other.checked}
                  disabled={pending}
                  onCheckedChange={(checked) => onOtherChange(checked === true)}
                />
                <span className="grid flex-1 gap-0.5 text-sm">
                  <span className="font-medium">
                    {labels.other[other.surface]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {labels.other.hint}
                  </span>
                </span>
                <OtherSurfacePreview
                  markup={otherSurfaceVersion(svg, other.surface)}
                  surface={other.surface}
                  className="h-14 w-28"
                />
              </label>
            )}
          </>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onKeep}>
            {labels.keep}
          </Button>
          <Button disabled={pending} onClick={onConfirm}>
            {pending && <Spinner />}
            {labels.confirm(count)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
