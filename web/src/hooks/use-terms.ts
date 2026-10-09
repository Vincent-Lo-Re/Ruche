import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

import { useAuth } from "@/auth/auth-context"
import { termsRead } from "@/lib/reads"
import { applyTerms } from "@/lib/terms"

/**
 * Les termes de l'installation (Paramètres › Avancé), lus pour un membre de l'équipe connecté :
 * gardés sur ce navigateur pour le prochain chargement ; la page se recharge s'ils changent.
 */
export function useTerms() {
  const { profile } = useAuth()
  const read = useQuery({ ...termsRead(), enabled: profile !== null })
  useEffect(() => {
    if (read.data) applyTerms(read.data)
  }, [read.data])
}
