import { cn } from "cn"

import { usePalette } from "@/components/theme/palette-context"
import { useBrandName, useIdentity } from "@/hooks/use-brand-name"
import {
  brandFileFor,
  brandMark,
  type IdentityTarget,
} from "@/lib/admin-identity"
import { presetOf } from "@/lib/palettes"

/**
 * La marque dessinée (ADMIN § 1, « Le nom de la marque ») : le logotype ou le monogramme pour le
 * fond où il est posé (« theme » : celui du thème, clair ou sombre), décliné aux couleurs de la
 * palette de ce membre s'il l'a été, sinon le nom en texte. Son nom reste lu par les lecteurs
 * d'écran (alt). `target` : la marque de l'admin, ou celle de l'app (dans ses aperçus, sans
 * palette).
 */
export function BrandLogo({
  kind,
  surface,
  className,
  target = "admin",
}: {
  kind: "logotype" | "monogram"
  surface: "light" | "dark" | "theme"
  // La hauteur de l'image (h-…) ; le texte garde la taille de son parent.
  className: string
  target?: IdentityTarget
}) {
  const brand = useIdentity(target)
  const name = useBrandName(target)
  // La déclinaison de la palette choisie par ce membre, s'il y en a une (l'admin seulement).
  const palette = presetOf(usePalette().palette)
  const preset = target === "admin" ? palette : null
  const light = brandFileFor(brand, kind, "light", preset)
  const dark = brandFileFor(brand, kind, "dark", preset)
  // Sans fichier : le nom en texte ; à la place d'un monogramme, les initiales (sinon l'initiale du nom).
  if (!light) {
    return <>{kind === "monogram" ? brandMark(brand?.initials, name) : name}</>
  }
  const image = (src: string, extra?: string) => (
    <img
      src={src}
      alt={name}
      className={cn("w-auto max-w-full object-contain", className, extra)}
    />
  )
  if (surface === "light") return image(light)
  if (surface === "dark") return image(dark ?? light)
  return (
    <>
      {image(light, "dark:hidden")}
      {image(dark ?? light, "hidden dark:block")}
    </>
  )
}
