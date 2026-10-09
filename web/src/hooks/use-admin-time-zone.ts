import { useEffect } from "react"

import { useBrand } from "@/hooks/use-brand-name"
import { applyAdminTimeZone } from "@/lib/time-zone"

/**
 * Le fuseau horaire de toute l'admin (Paramètres › Avancé), lu avec l'identité de l'admin : gardé
 * sur ce navigateur pour le prochain chargement ; la page se recharge s'il change.
 */
export function useAdminTimeZone() {
  const adminTimeZone = useBrand()?.timeZone
  useEffect(() => {
    if (adminTimeZone) applyAdminTimeZone(adminTimeZone)
  }, [adminTimeZone])
}
