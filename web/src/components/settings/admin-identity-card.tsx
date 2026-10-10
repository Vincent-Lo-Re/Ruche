import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Controller, useForm, useWatch } from "react-hook-form"

import { LoadState } from "@/components/load-state"
import { SaveFooter } from "@/components/settings/save-footer"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useBrandMutation } from "@/hooks/use-brand-name"
import { brandInitial, saveBrandDetails } from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { adminNameSchema } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity

/**
 * Le nom de la marque, son adresse de contact et son site web (onglet « Identité de l'admin » des
 * Paramètres, admins), carte de la section « Marque » (son titre et son explication sont à
 * gauche, SettingsSection) : le nom et les initiales côte à côte, l'adresse et le site web dessous, « Enregistrer »
 * dans le pied gris. Le nom s'affiche dans l'admin (vide : le nom à défaut) ; l'adresse aide sur
 * l'écran de connexion ; le site web est le lien « Site web » du header (vide : pas de lien).
 */
export function AdminIdentityCard() {
  const brand = useQuery(adminBrandRead())
  return brand.isSuccess ? (
    <BrandDetailsForm
      name={brand.data.name}
      initials={brand.data.initials}
      contactEmail={brand.data.contactEmail}
      websiteUrl={brand.data.websiteUrl}
    />
  ) : (
    <Card>
      <CardContent>
        <LoadState query={brand} rows={2} failed={labels.loadFailed} />
      </CardContent>
    </Card>
  )
}

function BrandDetailsForm({
  name,
  initials,
  contactEmail,
  websiteUrl,
}: {
  name: string | null
  initials: string | null
  contactEmail: string | null
  websiteUrl: string | null
}) {
  const form = useForm({
    resolver: zodResolver(adminNameSchema),
    defaultValues: {
      name: name ?? "",
      initials: initials ?? "",
      contactEmail: contactEmail ?? "",
      websiteUrl: websiteUrl ?? "",
    },
  })

  const save = useBrandMutation({
    // Vides : la base garde null (le nom à défaut, pas d'adresse, pas de lien).
    mutationFn: (values: {
      name: string
      initials: string
      contactEmail: string
      websiteUrl: string
    }) =>
      saveBrandDetails({
        name: values.name || null,
        initials: values.initials || null,
        contactEmail: values.contactEmail || null,
        websiteUrl: values.websiteUrl || null,
      }),
    saved: labels.saved,
    onSaved: (values) => form.reset(values),
  })

  const onSubmit = form.handleSubmit((values) => save.mutate(values))
  const nameValue = useWatch({ control: form.control, name: "name" })

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="@container pb-0">
        <CardContent className="grid gap-4 @lg:grid-cols-2">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-name">{labels.name}</FieldLabel>
                <Input
                  {...field}
                  id="admin-name"
                  placeholder={texts.app.name}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="initials"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-initials">
                  {labels.initials}
                </FieldLabel>
                <Input
                  {...field}
                  id="admin-initials"
                  maxLength={3}
                  // Vides : la première lettre du nom.
                  placeholder={brandInitial(nameValue || texts.app.name)}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="contactEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-email">{labels.email}</FieldLabel>
                <Input
                  {...field}
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder={labels.emailPlaceholder}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="websiteUrl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-website">
                  {labels.website}
                </FieldLabel>
                <Input
                  {...field}
                  id="admin-website"
                  type="url"
                  autoComplete="url"
                  placeholder={labels.websitePlaceholder}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </CardContent>
        <SaveFooter pending={save.isPending} dirty={form.formState.isDirty} />
      </Card>
    </form>
  )
}
