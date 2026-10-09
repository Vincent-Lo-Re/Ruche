// Les langues de l'app (Paramètres › Langues) : celles dans lesquelles l'app sert son contenu,
// comme des données de l'installation (table `languages`). Une seule langue par défaut, toujours
// active : celle d'un contenu sans traduction. À ne pas confondre avec la langue de l'interface
// de l'admin (lib/language.ts).

import type { Tables } from "@/lib/database.types"
import { language } from "@/lib/language"
import { supabase } from "@/lib/supabase"

export type AppLanguage = Pick<
  Tables<"languages">,
  "code" | "is_default" | "enabled"
>

export const appLanguagesKey = ["app-languages"] as const

/** Les langues de l'app, la langue par défaut d'abord. */
export async function listAppLanguages(): Promise<AppLanguage[]> {
  const { data, error } = await supabase
    .from("languages")
    .select("code, is_default, enabled")
    .order("is_default", { ascending: false })
    .order("code")
  if (error) throw error
  return data
}

export async function addAppLanguage(code: string): Promise<void> {
  const { error } = await supabase.from("languages").insert({ code })
  if (error) throw error
}

/** Propose (ou non) une langue dans l'app ; la langue par défaut reste toujours proposée. */
export async function setAppLanguageEnabled(
  code: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from("languages")
    .update({ enabled })
    .eq("code", code)
  if (error) throw error
}

export async function removeAppLanguage(code: string): Promise<void> {
  const { error } = await supabase.from("languages").delete().eq("code", code)
  if (error) throw error
}

/** Fait d'une langue la langue par défaut ; elle devient proposée, l'ancienne le reste. */
export async function setDefaultAppLanguage(code: string): Promise<void> {
  const { error } = await supabase.rpc("languages_set_default", {
    language_code: code,
  })
  if (error) throw error
}

// Les langues proposées à l'ajout : les plus courantes (codes BCP 47).
export const COMMON_LANGUAGES = [
  "ar",
  "bg",
  "ca",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "eu",
  "fa",
  "fi",
  "fr",
  "ga",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lt",
  "lv",
  "ms",
  "nb",
  "nl",
  "pl",
  "pt",
  "pt-BR",
  "ro",
  "ru",
  "sk",
  "sl",
  "sr",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh",
] as const

function capitalized(name: string, locale: string): string {
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
}

const names = new Intl.DisplayNames([language], {
  type: "language",
  languageDisplay: "standard",
})

/** Le nom d'une langue dans la langue de l'admin : « Anglais », « Portugais (Brésil) ». */
export function languageName(code: string): string {
  return capitalized(names.of(code) ?? code, language)
}

/** Le nom d'une langue dans elle-même : « English », « Português (Brasil) ». */
export function nativeLanguageName(code: string): string {
  const own = new Intl.DisplayNames([code], {
    type: "language",
    languageDisplay: "standard",
  })
  return capitalized(own.of(code) ?? code, code)
}
