import { useQuery } from "@tanstack/react-query"

import { usePalette } from "@/components/theme/palette-context"
import { useIdentity } from "@/hooks/use-brand-name"
import {
  brandFileFor,
  type BrandSurface,
  type IdentityTarget,
} from "@/lib/admin-identity"
import { presetOf } from "@/lib/palettes"
import { monogramSvgRead } from "@/lib/reads"

/**
 * Le monogramme d'un écran et sa version prête à animer (lib/monogram-motion.ts) : null pour un
 * fichier non compatible ou sans fichier. Pour l'admin, l'écran de connexion (version pour fond
 * sombre, aux couleurs de la palette) ; pour l'app, l'écran de chargement (version pour le fond du
 * téléphone, `surface`, sans palette). Lu par le monogramme animé et par les cases de ses
 * animations.
 */
export function useMonogramSvg(
  target: IdentityTarget = "admin",
  surface: BrandSurface = "dark"
) {
  const brand = useIdentity(target)
  const palette = presetOf(usePalette().palette)
  const url = brandFileFor(
    brand,
    "monogram",
    surface,
    target === "admin" ? palette : null
  )
  const svg = useQuery(monogramSvgRead(url))
  return { url, svg }
}
