// Les appels de Supabase Auth faits par les pages de connexion, d'invitation, de double
// vérification et du compte. Les pages n'appellent pas Supabase elles-mêmes.

import { isAuthApiError } from "@supabase/supabase-js"

import {
  authErrorMessage,
  isNotAMemberError,
  isRateLimitError,
} from "@/lib/auth-errors"
import { brandName, getAdminBrand } from "@/lib/admin-identity"
import type { Language } from "@/lib/language"
import { detachedAuth, supabase } from "@/lib/supabase"
import { texts } from "@/texts"

// « Code envoyé », « code déjà envoyé il y a moins d'une minute » (le code précédent reste
// valable), ou message d'erreur à afficher.
type SendResult = "sent" | "recentlySent" | { error: string }

/**
 * Demande un code de connexion.
 * Une adresse inconnue est traitée comme une adresse connue : l'interface ne dit
 * pas qui fait partie de l'équipe. Attention, l'API de Supabase Auth, appelable
 * directement avec la clé publique, répond elle différemment (limite connue de
 * Supabase) : ce masquage évite seulement de l'afficher.
 */
export async function sendSignInCode(email: string): Promise<SendResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })
  if (!error || isNotAMemberError(error)) return "sent"
  if (isRateLimitError(error)) return "recentlySent"
  return { error: authErrorMessage(error, "email") }
}

/** Vérifie le code reçu par e-mail. Renvoie le message d'erreur à afficher, sinon null. */
export async function verifySignInCode(
  email: string,
  code: string
): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  })
  return error ? authErrorMessage(error, "emailCode") : null
}

/** Accepte une invitation (lien de l'e-mail). Renvoie le message d'erreur, sinon null. */
export async function acceptInvitation(
  tokenHash: string
): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "invite",
  })
  return error ? authErrorMessage(error, "invitation") : null
}

type Enrollment = { factorId: string; qrCode: string; secret: string }

export const mfaEnrollmentKey = (userId: string) =>
  ["mfa-enrollment", userId] as const

/** Prépare une nouvelle app : les essais abandonnés (non vérifiés) sont d'abord retirés. */
export async function startMfaEnrollment(): Promise<Enrollment> {
  const { data: factors, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      })
      if (error) throw error
    }
  }

  const { data, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    // Le nom que l'app du téléphone affiche : la marque, sinon « Ruche ».
    issuer: brandName((await getAdminBrand().catch(() => null))?.name),
  })
  if (enrollError) throw enrollError
  // qr_code est déjà une image (data:image/svg+xml…), affichable telle quelle.
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

/** Vérifie un code de l'app d'authentification. Renvoie le message d'erreur, sinon null. */
export async function verifyMfaCode(
  factorId: string,
  code: string
): Promise<string | null> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  })
  return error ? authErrorMessage(error, "mfaCode") : null
}

/**
 * Ferme la session sur ce navigateur seulement : les autres appareils restent connectés.
 */
export async function signOutHere(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" })
}

/** Enregistre le nom du membre (la base n'autorise que le nom, sur sa propre fiche). */
export async function saveFullName(
  profileId: string,
  fullName: string
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", profileId)
    .select("id")
    .single()
  if (error) throw error
}

/**
 * Enregistre la langue du membre sur son compte (Mon compte ; null : celle de l'admin) : elle le
 * suit d'un navigateur à l'autre, et les e-mails qu'il reçoit la lisent.
 */
export async function saveLanguage(language: Language | null): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { language } })
  if (error) throw error
}

/**
 * Demande le changement d'adresse (Mon compte) : Supabase envoie un code à la nouvelle adresse et
 * un autre à l'adresse actuelle, qui sert d'alerte. Une adresse déjà prise par un autre compte est
 * refusée.
 */
export async function requestEmailChange(email: string): Promise<SendResult> {
  const { error } = await supabase.auth.updateUser({ email })
  if (!error) return "sent"
  if (isRateLimitError(error)) return "recentlySent"
  if (isAuthApiError(error) && error.code === "email_exists")
    return { error: texts.account.emailChange.taken }
  return { error: texts.common.unexpected }
}

/**
 * Confirme le changement d'adresse avec un code. Avec des codes, Supabase n'exige pas les deux
 * (essai du 09/10/2026, double_confirm_changes actif) : le code de la nouvelle adresse suffit, et
 * celui de l'adresse actuelle aussi, essayé s'il est refusé (les deux e-mails disent « saisis ce
 * code »). La vérification passe par detachedAuth : elle ouvrirait une nouvelle session sans la
 * double vérification ; la session du membre est relue à la place, avec sa nouvelle adresse.
 * Renvoie le message d'erreur à afficher, sinon null.
 */
export async function confirmEmailChange(
  newEmail: string,
  currentEmail: string,
  code: string
): Promise<string | null> {
  const verify = (email: string) =>
    detachedAuth.verifyOtp({ email, token: code, type: "email_change" })
  let { error } = await verify(newEmail)
  if (error && !isRateLimitError(error))
    ({ error } = await verify(currentEmail))
  if (error) return authErrorMessage(error, "emailCode")
  await supabase.auth.refreshSession()
  return null
}
