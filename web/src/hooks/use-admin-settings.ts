import { useEffect } from "react"

import { useBrand } from "@/hooks/use-brand-name"
import { applyAdminLanguage } from "@/lib/language"
import { applyAdminFormat } from "@/lib/regional-format"
import { applySectionNames } from "@/lib/section-names"
import { applyAdminTimeZone } from "@/lib/time-zone"

/**
 * Les réglages de toute l'admin (Paramètres › Avancé), lus avec l'identité de l'admin : la
 * langue, le format régional, le fuseau horaire et les noms du Blog et des Podcasts. Chacun est
 * gardé sur ce navigateur pour le prochain chargement ; la page se recharge si celui qui
 * s'applique change (la langue et le format, seulement si le membre n'a pas choisi les siens),
 * pour que tous les textes et les dates le prennent.
 */
export function useAdminSettings() {
  const brand = useBrand()
  const loaded = brand !== undefined
  const language = brand?.language
  const format = brand?.locale ?? null
  const timeZone = brand?.timeZone
  const sectionNames = brand?.sectionNames

  useEffect(() => {
    if (language) applyAdminLanguage(language)
  }, [language])
  useEffect(() => {
    if (loaded) applyAdminFormat(format)
  }, [loaded, format])
  useEffect(() => {
    if (timeZone) applyAdminTimeZone(timeZone)
  }, [timeZone])
  useEffect(() => {
    if (sectionNames) applySectionNames(sectionNames)
  }, [sectionNames])
}
