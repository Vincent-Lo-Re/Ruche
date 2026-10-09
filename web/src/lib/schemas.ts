import { z } from "zod"

import { ALT_MAX, TITLE_MAX } from "@/blocks/draft"
import { templateSections, templateSorts } from "@/lib/contents/templates"
import { texts } from "@/texts"

// Formulaires de l'admin : ce qui est saisi, et les messages en cas d'erreur.

export const MAX_NAME_LENGTH = 100

const email = (message: string) =>
  z.string().trim().toLowerCase().pipe(z.email(message))

const sixDigits = (message: string) => z.string().regex(/^\d{6}$/, message)

const fullName = (message: string) =>
  z.string().trim().max(MAX_NAME_LENGTH, message)

export const signInEmailSchema = z.object({
  email: email(texts.signIn.invalidEmail),
})

/**
 * Vrai si l'adresse est bien écrite : le bouton « Recevoir un code » ne s'active qu'alors. La base
 * n'est pas interrogée : la page de connexion ne dit pas qui fait partie de l'équipe (ADMIN § 2).
 */
export function isSignInEmail(value: string): boolean {
  return signInEmailSchema.safeParse({ email: value }).success
}

export const signInCodeSchema = z.object({
  code: sixDigits(texts.signIn.invalidCode),
})

export const mfaCodeSchema = z.object({
  code: sixDigits(texts.mfa.invalidCode),
})

/** Vrai si les 6 chiffres d'un code sont saisis : son bouton ne s'active qu'alors. */
export function isCompleteCode(value: string): boolean {
  return signInCodeSchema.safeParse({ code: value }).success
}

export const profileSchema = z.object({
  full_name: fullName(texts.account.profile.nameTooLong),
})

// Le nom de la marque : mêmes limites que la base (table admin_identity) ; vide : « Ruche ».
const ADMIN_NAME_MAX = 40
// Le site web du client : une adresse https, comme l'exige la base.
const WEBSITE_MAX = 2048
const WEBSITE_PATTERN = /^https:\/\/[^\s/?#]+\.[^\s/?#]+(\/\S*)?$/

export const adminNameSchema = z.object({
  name: z
    .string()
    .trim()
    .max(ADMIN_NAME_MAX, texts.settings.adminIdentity.nameTooLong),
  // Vides : la première lettre du nom. Même règle que la base (admin_identity.initials).
  initials: z
    .string()
    .trim()
    .max(3, texts.settings.adminIdentity.initialsTooLong),
  // Vide : pas d'adresse de contact.
  contactEmail: z.union([
    z.literal(""),
    email(texts.settings.adminIdentity.invalidEmail),
  ]),
  // Vide : pas de lien « Site web ». Même règle que la base (admin_identity.website_url).
  websiteUrl: z
    .string()
    .trim()
    .refine(
      (url) =>
        url === "" || (url.length <= WEBSITE_MAX && WEBSITE_PATTERN.test(url)),
      texts.settings.adminIdentity.invalidWebsite
    ),
})

export const inviteSchema = z.object({
  email: email(texts.team.invalidEmail),
  full_name: fullName(texts.team.nameTooLong),
  role: z.enum(["admin", "editor"]),
})

// Fiche d'un fichier de la médiathèque : mêmes limites que la base (table media).
export const mediaDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, texts.media.detail.nameRequired)
    .max(255, texts.media.detail.nameTooLong),
  alt: z.string().trim().max(ALT_MAX, texts.media.detail.altTooLong),
  transcript: z
    .string()
    .trim()
    .max(200_000, texts.media.detail.transcriptTooLong),
})

// Formule d'abonnement : mêmes limites que la base (table access_levels).
export const accessLevelNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, texts.settings.accessLevels.nameRequired)
    .max(MAX_NAME_LENGTH, texts.settings.accessLevels.nameTooLong),
})

// Catégorie du Blog ou des Podcasts : mêmes limites que la base (table categories).
export const categoryNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, texts.categories.nameRequired)
    .max(MAX_NAME_LENGTH, texts.categories.nameTooLong),
})

// Nouveau modèle (section Modèles, ou « Enregistrer comme modèle ») : mêmes règles que la base
// (content_create, template_create_from) : nom de 1 à 200 caractères, section d'un point de
// départ obligatoire ([D42]).
export const templateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, texts.templates.create.nameRequired)
      .max(TITLE_MAX, texts.templates.create.nameTooLong),
    sort: z.enum(templateSorts),
    templateFor: z.enum(templateSections).nullable(),
  })
  .refine((value) => value.sort !== "starter" || value.templateFor !== null, {
    path: ["templateFor"],
    message: texts.templates.create.sectionRequired,
  })

export type TemplateValues = z.infer<typeof templateSchema>

// Les noms du Blog et des Podcasts (Paramètres › Avancé). Même règle que la base
// (domaine section_form, 40 caractères au plus) : les trois formes françaises toutes, ou aucune.
const sectionNames = texts.settings.advanced.sectionNames
const sectionForm = z.string().trim().max(40, sectionNames.tooLong)
const sectionFields = z
  .object({
    name: sectionForm,
    le: sectionForm,
    du: sectionForm,
    en: sectionForm,
  })
  .superRefine((value, context) => {
    const french = [value.name, value.le, value.du]
    const filled = french.filter((form) => form !== "").length
    if (filled === 0 || filled === 3) return
    for (const key of ["name", "le", "du"] as const) {
      if (value[key] === "") {
        context.addIssue({
          code: "custom",
          path: [key],
          message: sectionNames.incomplete,
        })
      }
    }
  })

export const sectionNamesSchema = z.object({
  blog: sectionFields,
  podcasts: sectionFields,
})
