import { useEffect } from "react"

import { useBrand } from "@/hooks/use-brand-name"
import { applySectionNames } from "@/lib/section-names"

/**
 * Les noms du Blog et des Podcasts (Paramètres › Avancé), lus avec l'identité de l'admin : gardés
 * sur ce navigateur pour le prochain chargement ; la page se recharge s'ils ont changé, pour que
 * tous les textes les prennent.
 */
export function useAdminSectionNames() {
  const names = useBrand()?.sectionNames
  useEffect(() => {
    if (names) applySectionNames(names)
  }, [names])
}
