import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { BrandSurfaceDialog } from "@/components/settings/brand-surface-dialog"
import { BrandVariantsDialog } from "@/components/settings/brand-variants-dialog"
import { FileSlot } from "@/components/settings/file-slot"
import {
  adminBrandKey,
  BrandFileError,
  brandFileAccept,
  brandFileSurface,
  hasBrandVariants,
  prepareBrandFile,
  removeBrandFile,
  saveBrandFile,
  saveBrandVariants,
  saveOtherSurface,
  type PreparedBrandFile,
} from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files

type Surface = "light" | "dark"

/**
 * Un fichier de la marque (FileSlot, « Logotype · fond clair »), montré sur ce fond. Un fichier
 * qui semble fait pour l'autre fond (un logo clair sur fond clair…) le fait dire, et peut y aller
 * (BrandSurfaceDialog). Un SVG aux couleurs modifiables demande s'il faut le décliner aux couleurs
 * des palettes, et propose sa version pour l'autre fond si celui-ci est vide (BrandVariantsDialog).
 */
export function BrandFileSlot({
  kind,
  surface,
}: {
  kind: "logotype" | "monogram"
  surface: "light" | "dark"
}) {
  const slot = `${kind}-${surface}` as const
  const queryClient = useQueryClient()
  const brand = useQuery(adminBrandRead()).data
  const file = brand?.[slot] ?? null
  const label = labels.label(labels[kind].title, labels[surface])
  // Où va le fichier choisi : ce fond, ou l'autre si l'admin l'y envoie (BrandSurfaceDialog).
  const [target, setTarget] = useState<Surface>(surface)
  const slotOf = (on: Surface) => `${kind}-${on}` as const
  const opposite = (on: Surface): Surface => (on === "light" ? "dark" : "light")
  const other = brand?.[slotOf(opposite(target))]
  // Un fichier qui semble fait pour l'autre fond, en attente de la réponse.
  const [mismatch, setMismatch] = useState<{
    prepared: PreparedBrandFile
    fits: Surface
  } | null>(null)
  // Un SVG aux couleurs modifiables, en attente de la réponse : le décliner ou non.
  const [asking, setAsking] = useState<PreparedBrandFile | null>(null)
  // L'autre fond vide : y mettre la version tirée de ce fichier (proposé, coché au départ).
  const [alsoOther, setAlsoOther] = useState(true)

  // Les déclinaisons existantes partent avec un fichier envoyé sans être décliné, ou retiré : on
  // le dit sous le message (un SVG aux couleurs modifiables repose la question avant).
  const hadVariants = brand ? hasBrandVariants(brand, kind) : false
  const onDone = async (message: string, variantsRemoved: boolean) => {
    await queryClient.invalidateQueries({ queryKey: adminBrandKey })
    toast.success(message, {
      description: variantsRemoved ? labels.variants.removed : undefined,
    })
  }
  const onError = (error: Error) =>
    toast.error(
      error instanceof BrandFileError ? error.message : texts.common.unexpected
    )
  const save = useMutation({
    mutationFn: async ({
      prepared,
      decline,
      on,
    }: {
      prepared: PreparedBrandFile
      decline: boolean
      on: Surface
    }) => {
      const replaced = brand?.[slotOf(on)]?.path ?? null
      await saveBrandFile(slotOf(on), prepared, replaced)
      // La carte de l'autre fond, vide, reçoit sa version si elle est demandée.
      const fill =
        !brand?.[slotOf(opposite(on))] && alsoOther
          ? slotOf(opposite(on))
          : null
      if (decline && prepared.svg) {
        await saveBrandVariants(kind, prepared.svg, fill)
      } else if (fill && prepared.svg) {
        await saveOtherSurface(prepared.svg, fill)
      }
    },
    onSuccess: (_, { decline }) =>
      onDone(
        decline ? labels.variants.done : labels.saved,
        !decline && hadVariants
      ),
    onError,
    onSettled: () => setAsking(null),
  })
  const remove = useMutation({
    mutationFn: (path: string) => removeBrandFile(slot, path),
    onSuccess: () => onDone(labels.removed, hadVariants),
    onError,
  })
  const busy = save.isPending || remove.isPending

  // Un SVG aux couleurs modifiables pose la question ; les autres fichiers partent tels quels.
  const place = (prepared: PreparedBrandFile, on: Surface) => {
    setTarget(on)
    if (prepared.svg) {
      setAlsoOther(true)
      setAsking(prepared)
    } else save.mutate({ prepared, decline: false, on })
  }
  // D'abord : ce fichier semble-t-il fait pour l'autre fond ?
  const choose = async (chosen: File) => {
    try {
      const prepared = await prepareBrandFile(chosen)
      const fits = await brandFileSurface(prepared)
      if (fits && fits !== surface) setMismatch({ prepared, fits })
      else place(prepared, surface)
    } catch (error) {
      onError(error as Error)
    }
  }

  return (
    <>
      <FileSlot
        label={label}
        caption={labels[surface]}
        url={file?.url ?? null}
        busy={busy}
        accept={brandFileAccept}
        onChoose={(chosen) => void choose(chosen)}
        onRemove={() => file && remove.mutate(file.path)}
        // L'aperçu sur le fond auquel la version est destinée, pas sur celui du thème.
        frameClassName={
          surface === "light" ? "bg-brand-light" : "bg-brand-dark"
        }
        zoneClassName={
          surface === "light"
            ? "text-brand-light-muted"
            : "text-brand-dark-muted"
        }
      />
      <BrandSurfaceDialog
        fits={mismatch?.fits ?? null}
        onMove={() => {
          if (!mismatch) return
          setMismatch(null)
          place(mismatch.prepared, mismatch.fits)
        }}
        onKeep={() => {
          if (!mismatch) return
          setMismatch(null)
          place(mismatch.prepared, surface)
        }}
      />
      <BrandVariantsDialog
        file={asking}
        pending={save.isPending}
        other={
          other
            ? null
            : {
                surface: opposite(target),
                checked: alsoOther,
              }
        }
        onOtherChange={setAlsoOther}
        onKeep={() =>
          asking &&
          save.mutate({ prepared: asking, decline: false, on: target })
        }
        onConfirm={() =>
          asking && save.mutate({ prepared: asking, decline: true, on: target })
        }
      />
    </>
  )
}
