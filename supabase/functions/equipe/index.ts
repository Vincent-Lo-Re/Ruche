// Fonction serveur « equipe » : la liste de l'équipe, lisible par toute l'équipe (admins et
// éditeurs, 09/10/2026) ; inviter, changer un rôle, retirer un membre, réinitialiser sa double
// vérification ou remettre la langue des e-mails à celle de l'admin, réservés aux admins.
//
// Appel : POST avec un JSON { action, ... } (voir validation.ts) et la session de l'admin dans
// l'en-tête Authorization (supabase.functions.invoke l'ajoute tout seul).
// Réponse : 200 avec les données, ou { error: { code, message } } avec un statut 4xx/5xx.
//
// Sécurité : c'est la base qui décide si l'appelant est de l'équipe et s'il est admin
// (public.is_staff() et public.is_admin(), qui exigent aussi la double vérification). Les opérations se font ensuite avec la clé secrète, fournie par la
// plateforme ; aucune clé n'est écrite ici.

import { createClient, isAuthApiError, type User } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"
import { HttpError, json, readKey } from "../_shared/http.ts"
import { parseRequest, type TeamLanguage, type TeamRequest, type TeamRole } from "./validation.ts"

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: TeamRole
}

// Une ligne de public.team_members().
type TeamMemberRow = Profile & {
  created_at: string
  invited_at: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  mfa_enabled_at: string | null
}

// Ce que renvoient « list » et « invite » pour chaque membre.
export type Member = Profile & {
  created_at: string
  // « invited » : l'invitation n'a pas encore été acceptée.
  status: "invited" | "active"
  invited_at: string | null
  last_sign_in_at: string | null
  // Double vérification configurée, et depuis quand.
  mfa_enabled: boolean
  mfa_enabled_at: string | null
}

const messages = {
  notSignedIn: "Connecte-toi pour continuer.",
  staffOnly: "Réservé à l'équipe, après la double vérification.",
  adminsOnly: "Réservé aux admins, après la double vérification.",
  lastAdmin: "L'équipe doit garder au moins un admin qui a configuré la double vérification.",
  notFound: "Ce membre n'existe pas.",
  alreadyMember: "Cette adresse fait déjà partie de l'équipe.",
  alreadyAccepted: "Cette personne a déjà accepté son invitation.",
  notYourself: "Tu ne peux pas faire ça sur ton propre compte. Demande à un autre admin.",
  tooManyEmails: "Trop d'e-mails envoyés. Réessaie dans une minute.",
  methodNotAllowed: "Méthode non autorisée.",
  server: "Un problème est survenu. Réessaie dans un instant.",
} as const

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const publishableKey = readKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY")
const secretKey = readKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY")

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(supabaseUrl, secretKey, clientOptions)

// Vérifie la session de l'appelant et son rôle d'admin (en aal2). Renvoie son compte.
/** L'appelant, de l'équipe (sinon refusé), et s'il est admin. */
async function authenticate(request: Request): Promise<{ user: User; isAdmin: boolean }> {
  const match = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)
  if (!match) throw new HttpError(401, "non_connecte", messages.notSignedIn)
  const token = match[1]

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) throw new HttpError(401, "non_connecte", messages.notSignedIn)

  // Client soumis aux règles de la base, avec la session de l'appelant.
  const asCaller = createClient(supabaseUrl, publishableKey, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: isStaff, error: staffError } = await asCaller.rpc("is_staff")
  if (staffError) throw new Error(`is_staff : ${staffError.message}`)
  if (isStaff !== true) throw new HttpError(403, "reserve_a_l_equipe", messages.staffOnly)
  const { data: isAdmin, error } = await asCaller.rpc("is_admin")
  if (error) throw new Error(`is_admin : ${error.message}`)

  return { user: userData.user, isAdmin: isAdmin === true }
}

function toMember({ email_confirmed_at, ...row }: TeamMemberRow): Member {
  return {
    ...row,
    status: email_confirmed_at ? "active" : "invited",
    mfa_enabled: row.mfa_enabled_at !== null,
  }
}

async function listMembers(userId?: string): Promise<Member[]> {
  let query = admin.rpc("team_members")
  if (userId) query = query.eq("id", userId)
  const { data, error } = await query
  if (error) throw new Error(`équipe : ${error.message}`)
  return (data as TeamMemberRow[]).map(toMember)
}

const profileColumns = "id, email, full_name, role"

async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await admin
    .from("profiles")
    .select(profileColumns)
    .eq("id", userId)
    .maybeSingle<Profile>()
  if (error) throw new Error(`profil : ${error.message}`)
  if (!data) throw new HttpError(404, "introuvable", messages.notFound)
  return data
}

async function getUser(userId: string): Promise<User> {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) {
    if (error?.status === 404) throw new HttpError(404, "introuvable", messages.notFound)
    throw new Error(`compte : ${error?.message}`)
  }
  return data.user
}

// Il doit rester un autre admin capable d'agir : invitation acceptée et double vérification
// configurée (même règle que le déclencheur protect_last_admin de la base).
async function ensureAnotherAdmin(userId: string): Promise<void> {
  const { data, error } = await admin.rpc("has_other_active_admin", {
    excluded_user_id: userId,
  })
  if (error) throw new Error(`admins : ${error.message}`)
  if (data !== true) throw new HttpError(409, "dernier_admin", messages.lastAdmin)
}

function refuseOnYourself(userId: string, caller: User): void {
  if (userId === caller.id) throw new HttpError(403, "soi_meme", messages.notYourself)
}

// Traduit les erreurs d'envoi d'e-mail de Supabase Auth.
function inviteError(error: unknown): Error {
  if (isAuthApiError(error)) {
    if (error.code === "email_exists") {
      return new HttpError(409, "deja_membre", messages.alreadyMember)
    }
    if (error.status === 429 || error.code?.startsWith("over_")) {
      return new HttpError(429, "trop_de_demandes", messages.tooManyEmails)
    }
  }
  return new Error(`invitation : ${error instanceof Error ? error.message : String(error)}`)
}

// Envoie (ou renvoie) l'e-mail d'invitation à un compte pas encore confirmé.
async function sendInvitation(email: string): Promise<void> {
  const { error } = await admin.auth.admin.inviteUserByEmail(email)
  if (error) throw inviteError(error)
}

// La langue de toute l'admin (Paramètres › Avancé).
async function adminLanguage(): Promise<TeamLanguage> {
  const { data, error } = await admin
    .from("admin_identity")
    .select("language")
    .single<{ language: TeamLanguage }>()
  if (error) throw new Error(`langue de l'admin : ${error.message}`)
  return data.language
}

// Les modèles d'e-mails ne lisent que le compte (user_metadata), pas la base : chaque compte
// porte la langue de ses e-mails (email_language), la sienne, sinon celle de l'admin. Ici, celle
// des membres qui suivent l'admin est remise à la langue de l'admin. Renvoie le nombre de comptes
// changés.
async function syncEmailLanguages(): Promise<number> {
  const language = await adminLanguage()
  let changed = 0
  for (let page = 1;; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`comptes : ${error.message}`)
    for (const user of data.users) {
      const metadata = user.user_metadata ?? {}
      const own = metadata.language === "en" || metadata.language === "fr"
      if (own || metadata.email_language === language) continue
      // Ajouté aux données du compte, sans toucher aux autres (nom, langue, format).
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { email_language: language },
      })
      if (updateError) throw new Error(`compte : ${updateError.message}`)
      changed++
    }
    if (data.users.length < 1000) return changed
  }
}

// Crée le compte avec son rôle dans app_metadata (que seule la clé secrète peut écrire) : la
// base crée la fiche avec ce rôle (handle_new_user), puis l'invitation part. Le nom et la langue
// vont dans user_metadata, que lisent les e-mails (et la langue, l'admin). Si l'e-mail ne part
// pas, le compte est supprimé : il n'y a jamais de membre à moitié invité.
async function createInvitedUser(
  email: string,
  fullName: string | null,
  role: TeamRole,
  language: TeamLanguage | null,
): Promise<User> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    app_metadata: { role },
    user_metadata: {
      ...(fullName ? { full_name: fullName } : {}),
      ...(language ? { language } : {}),
      email_language: language ?? (await adminLanguage()),
    },
  })
  if (error || !data.user) throw inviteError(error)
  try {
    await sendInvitation(email)
  } catch (sendError) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
    if (deleteError) console.error("equipe : nettoyage :", deleteError.message)
    throw sendError
  }
  return data.user
}

async function run(request: TeamRequest, caller: User): Promise<unknown> {
  switch (request.action) {
    case "list":
      return { members: await listMembers() }

    case "invite": {
      const { data: existing, error } = await admin
        .from("profiles")
        .select("id")
        .eq("email", request.email)
        .maybeSingle()
      if (error) throw new Error(`profil : ${error.message}`)
      if (existing) throw new HttpError(409, "deja_membre", messages.alreadyMember)

      const user = await createInvitedUser(
        request.email,
        request.full_name,
        request.role,
        request.language,
      )
      const [member] = await listMembers(user.id)
      return { member }
    }

    case "resend": {
      const user = await getUser(request.user_id)
      if (user.email_confirmed_at || !user.email) {
        throw new HttpError(409, "deja_acceptee", messages.alreadyAccepted)
      }
      await sendInvitation(user.email)
      return { ok: true }
    }

    case "set_role": {
      // Pas de changement de son propre rôle : un autre admin s'en charge (évite de se retirer
      // les droits d'admin par erreur, en un clic).
      refuseOnYourself(request.user_id, caller)
      const profile = await getProfile(request.user_id)
      if (profile.role === request.role) return { ok: true }
      if (profile.role === "admin") await ensureAnotherAdmin(profile.id)
      const { error } = await admin
        .from("profiles")
        .update({ role: request.role })
        .eq("id", profile.id)
      if (error?.message === "dernier_admin") {
        throw new HttpError(409, "dernier_admin", messages.lastAdmin)
      }
      if (error) throw new Error(`rôle : ${error.message}`)
      return { ok: true }
    }

    case "remove": {
      refuseOnYourself(request.user_id, caller)
      const profile = await getProfile(request.user_id)
      if (profile.role === "admin") await ensureAnotherAdmin(profile.id)
      const { error } = await admin.auth.admin.deleteUser(profile.id)
      if (error) {
        // Deux admins retirés en même temps : la base garde le dernier (protect_last_admin).
        if (profile.role === "admin") await ensureAnotherAdmin(profile.id)
        throw new Error(`suppression : ${error.message}`)
      }
      return { ok: true }
    }

    case "sync_email_languages":
      return { ok: true, changed: await syncEmailLanguages() }

    case "reset_mfa": {
      refuseOnYourself(request.user_id, caller)
      const profile = await getProfile(request.user_id)
      const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: profile.id })
      if (error) throw new Error(`facteurs : ${error.message}`)
      for (const factor of data.factors) {
        const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
          id: factor.id,
          userId: profile.id,
        })
        if (deleteError) throw new Error(`facteur : ${deleteError.message}`)
      }
      // Ses sessions ouvertes avaient passé la double vérification : on les ferme.
      const { error: sessionsError } = await admin.rpc("end_member_sessions", {
        target_user_id: profile.id,
      })
      if (sessionsError) throw new Error(`sessions : ${sessionsError.message}`)
      return { ok: true, removed: data.factors.length }
    }
  }
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request.headers.get("Origin"))
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers })

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "methode_refusee", messages.methodNotAllowed)
    }
    const { user: caller, isAdmin } = await authenticate(request)

    const body = await request.json().catch(() => undefined)
    const parsed = parseRequest(body)
    if (!parsed.ok) {
      throw new HttpError(400, "demande_invalide", parsed.message)
    }
    // Un éditeur lit la liste, sans rien y changer.
    if (parsed.request.action !== "list" && !isAdmin) {
      throw new HttpError(403, "reserve_aux_admins", messages.adminsOnly)
    }

    return json(200, await run(parsed.request, caller), headers)
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.status, { error: { code: error.code, message: error.message } }, headers)
    }
    // Pas de données personnelles dans les journaux : seulement le message technique.
    console.error("equipe :", error instanceof Error ? error.message : error)
    return json(500, { error: { code: "erreur_serveur", message: messages.server } }, headers)
  }
})
