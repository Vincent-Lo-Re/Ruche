// La charte de l'app dans la base (table app_style, une seule ligne) : le brouillon que composent
// les admins, sa révision et la version publiée, celle que lit l'app (app_style()). Les écritures
// passent par style_save, style_publish et style_discard, avec la révision attendue.

import type { PostgrestError } from "@supabase/supabase-js"

import { fontFiles, fontFolder, fontPath } from "@/lib/app-style/fonts"
import type { AppStyle } from "@/lib/app-style/style"
import type { Json } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

export const appStyleKey = ["app-style"] as const

const FONTS_BUCKET = "polices"

/** La charte enregistrée : null là où il n'y a rien (la charte neutre). */
export type AppStyleRow = {
  draft: AppStyle | null
  revision: number
  published: AppStyle | null
  publishedAt: string | null
}

type StyleErrorCode = keyof typeof texts.appStyle.errors

/** Erreur de la base sur la charte, avec son code (s'il est connu) et ses faits. */
export class StyleError extends Error {
  readonly code: StyleErrorCode | null
  readonly facts: unknown

  constructor(code: StyleErrorCode | null, facts: unknown = null) {
    super(code ? texts.appStyle.errors[code] : texts.common.unexpected)
    this.name = "StyleError"
    this.code = code
    this.facts = facts
  }
}

function toStyleError(error: PostgrestError): StyleError {
  const known = texts.appStyle.errors
  if (!Object.hasOwn(known, error.message)) return new StyleError(null)
  let facts: unknown
  try {
    facts = error.hint ? JSON.parse(error.hint) : null
  } catch {
    facts = null
  }
  return new StyleError(error.message as StyleErrorCode, facts)
}

export async function getAppStyle(): Promise<AppStyleRow> {
  const { data, error } = await supabase
    .from("app_style")
    .select("draft, draft_rev, published, published_at")
    .single()
  if (error) throw toStyleError(error)
  // La base ne garde qu'une charte valable (contrainte de la table).
  return {
    draft: data.draft as AppStyle | null,
    revision: data.draft_rev,
    published: data.published as AppStyle | null,
    publishedAt: data.published_at,
  }
}

/** Enregistre le brouillon ; rend la nouvelle révision. */
export async function saveStyle(
  style: AppStyle,
  revision: number
): Promise<number> {
  const { data, error } = await supabase.rpc("style_save", {
    new_draft: style as unknown as Json,
    expected_rev: revision,
  })
  if (error) throw toStyleError(error)
  return data
}

/**
 * Publie le brouillon : copie d'abord dans l'espace « polices » celles de ses polices qui n'y
 * sont pas encore (avec leur licence), puis publie. Rend la révision, inchangée.
 */
export async function publishStyle(
  style: AppStyle | null,
  revision: number
): Promise<number> {
  if (style) await copyFonts(style)
  const { data, error } = await supabase.rpc("style_publish", {
    expected_rev: revision,
  })
  if (error) throw toStyleError(error)
  return data
}

/** Remet le brouillon à la version publiée ; rend la nouvelle révision. */
export async function discardStyle(revision: number): Promise<number> {
  const { data, error } = await supabase.rpc("style_discard", {
    expected_rev: revision,
  })
  if (error) throw toStyleError(error)
  return data
}

/** Copie les polices de la charte absentes de l'espace « polices », depuis public/fonts/. */
async function copyFonts(style: AppStyle) {
  const bucket = supabase.storage.from(FONTS_BUCKET)
  const byFolder = new Map<string, string[]>()
  for (const { family, weight } of fontFiles(style)) {
    const folder = fontFolder(family)
    byFolder.set(folder, [
      ...(byFolder.get(folder) ?? []),
      fontPath(family, weight),
    ])
  }
  for (const [folder, paths] of byFolder) {
    const { data: present, error } = await bucket.list(folder)
    if (error) throw new Error(texts.appStyle.copyFailed)
    const names = new Set(
      (present ?? []).map((file) => `${folder}/${file.name}`)
    )
    const missing = [...paths, `${folder}/OFL.txt`].filter(
      (path) => !names.has(path)
    )
    for (const path of missing) {
      const response = await fetch(`/fonts/${path}`)
      if (!response.ok) throw new Error(texts.appStyle.copyFailed)
      const { error: uploadError } = await bucket.upload(
        path,
        await response.blob(),
        { contentType: path.endsWith(".txt") ? "text/plain" : "font/ttf" }
      )
      // Déjà là (envoyé par un autre admin entre-temps) : c'est le même fichier.
      if (uploadError && !/exists/i.test(uploadError.message))
        throw new Error(texts.appStyle.copyFailed)
    }
  }
}
