import { useEffect } from "react"

import { useBrand } from "@/hooks/use-brand-name"
import { applyAdminFormat } from "@/lib/regional-format"

/**
 * Le format régional de toute l'admin (Paramètres › Avancé), lu avec l'identité de l'admin : gardé
 * sur ce navigateur pour le prochain chargement ; la page se recharge s'il change et que le membre
 * n'a pas choisi le sien.
 */
export function useAdminFormat() {
  const brand = useBrand()
  const loaded = brand !== undefined
  const adminFormat = brand?.locale ?? null
  useEffect(() => {
    if (loaded) applyAdminFormat(adminFormat)
  }, [loaded, adminFormat])
}
