import type { Session } from "@supabase/supabase-js"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"

import {
  AuthContext,
  profileQueryKey,
  type AuthValue,
} from "@/auth/auth-context"
import { assuranceLevel, verifiedTotpFactor } from "@/auth/session"
import { applyMemberLanguage, memberLanguage } from "@/lib/language"
import { applyMemberFormat, memberFormat } from "@/lib/regional-format"
import { fetchProfile, onSessionChange, signOutHere } from "@/lib/auth"

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
