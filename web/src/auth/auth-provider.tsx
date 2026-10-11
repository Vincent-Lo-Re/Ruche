import type { Session } from "@supabase/supabase-js"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"

import {
  AuthContext,
  profileQueryKey,
  type AuthValue,
} from "@/auth/auth-context"
import { assuranceLevel, verifiedTotpFactor } from "@/auth/session"
import { applyMemberLanguage, language, memberLanguage } from "@/lib/language"
import { applyMemberFormat, memberFormat } from "@/lib/regional-format"
import {
  fetchProfile,
  onSessionChange,
  saveEmailLanguage,
  signOutHere,
} from "@/lib/auth"
import { reportError } from "@/lib/sentry"

/** Suit la session Supabase et charge la fiche du membre connecté. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<{
    loading: boolean
    session: Session | null
  }>({ loading: true, session: null })

  useEffect(
    () =>
      onSessionChange((event, session) => {
        setState({ loading: false, session })
        if (event === "SIGNED_OUT") queryClient.clear()
      }),
    [queryClient]
  )

  const { session } = state
  const userId = session?.user.id

  // La langue du membre le suit d'un navigateur à l'autre : celle de son compte (ou aucune : il
  // suit l'admin) remplace celle gardée ici ; la page se recharge si la langue change.
  const chosenLanguage = memberLanguage(session?.user.user_metadata)
  useEffect(() => {
    if (userId) applyMemberLanguage(chosenLanguage)
  }, [userId, chosenLanguage])
  // La langue de ses e-mails, celle qui s'applique ici (la sienne, sinon celle de l'admin), tenue
  // à jour sur son compte. Pas tant qu'un rechargement va changer la langue de la page.
  const emailLanguage = session?.user.user_metadata?.email_language
  useEffect(() => {
    if (!userId || emailLanguage === language) return
    if (chosenLanguage !== null && chosenLanguage !== language) return
    saveEmailLanguage(language).catch(reportError)
  }, [userId, emailLanguage, chosenLanguage])
  // De même pour son format régional.
  const chosenFormat = memberFormat(session?.user.user_metadata)
  useEffect(() => {
    if (userId) applyMemberFormat(chosenFormat)
  }, [userId, chosenFormat])
  const profileQuery = useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId!),
    enabled: userId !== undefined,
  })

  // Une session sans fiche : le membre a été retiré de l'équipe.
  const removed = profileQuery.isSuccess && profileQuery.data === null
  useEffect(() => {
    if (removed) void signOutHere()
  }, [removed])

  const value: AuthValue = {
    loading: state.loading,
    session,
    level: session ? assuranceLevel(session) : null,
    factor: session ? verifiedTotpFactor(session) : null,
    profile: profileQuery.data ?? null,
    // Une relecture qui échoue en arrière-plan (réseau coupé au retour sur l'onglet) garde la
    // fiche déjà chargée : l'erreur ne bloque l'admin que s'il n'y a encore aucune fiche.
    profileState:
      profileQuery.data !== undefined
        ? "ready"
        : profileQuery.isError
          ? "error"
          : "loading",
  }

  return <AuthContext value={value}>{children}</AuthContext>
}
