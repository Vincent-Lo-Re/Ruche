import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Fragment } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import type { z } from "zod"

import { LoadState } from "@/components/load-state"
import { SaveFooter } from "@/components/settings/save-footer"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useBrandMutation } from "@/hooks/use-brand-name"
import { saveSectionNames } from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { sectionNamesSchema } from "@/lib/schemas"
import {
  NAMED_SECTIONS,
  type CustomSectionNames,
  type NamedSection,
} from "@/lib/section-names"
import { texts } from "@/texts"
import { defaultSectionNames } from "@/texts/section-names"

const labels = texts.settings.advanced.sectionNames

type Values = z.infer<typeof sectionNamesSchema>

/** Ce que la base garde en champs du formulaire (vides : le nom d'origine). */
function toValues(names: CustomSectionNames): Values {
  const fields = (section: NamedSection) => ({
    name: names.fr[section]?.name ?? "",
    le: names.fr[section]?.le ?? "",
    du: names.fr[section]?.du ?? "",
    en: names.en[section] ?? "",
  })
  return { blog: fields("blog"), podcasts: fields("podcasts") }
}

/** Les champs du formulaire en noms pour la base (vides : null, le nom d'origine). */
function fromValues(values: Values): CustomSectionNames {
  const french = (section: NamedSection) => {
    const { name, le, du } = values[section]
    return name && le && du ? { name, le, du } : null
  }
  return {
    fr: { blog: french("blog"), podcasts: french("podcasts") },
    en: {
      blog: values.blog.en || null,
      podcasts: values.podcasts.en || null,
    },
  }
}

/**
 * Les noms du Blog et des Podcasts (Paramètres › Avancé, admins) : pour chaque section, en
 * français trois formes écrites à la main (le nom, avec « le », avec « du »), et en anglais le nom,
 * chacune avec un exemple sous son champ, qui suit ce qui est écrit ; vides, le nom d'origine (en gris). « Enregistrer » dans le pied
 * gris ; la page se recharge ensuite pour que tous les textes les prennent (useAdminSettings).
 */
export function SectionNamesCard() {
  const brand = useQuery(adminBrandRead())
  return brand.isSuccess ? (
    <SectionNamesForm names={brand.data.sectionNames} />
  ) : (
    <Card>
      <CardContent>
        <LoadState query={brand} rows={2} failed={texts.common.unexpected} />
      </CardContent>
    </Card>
  )
}

function SectionNamesForm({ names }: { names: CustomSectionNames }) {
  const form = useForm({
    resolver: zodResolver(sectionNamesSchema),
    defaultValues: toValues(names),
  })

  const save = useBrandMutation({
    mutationFn: (values: Values) => saveSectionNames(fromValues(values)),
    saved: labels.saved,
    // Les noms relus, la page se recharge (useAdminSettings).
    onSaved: (values) => form.reset(values),
  })

  return (
    <form
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
      noValidate
    >
      <Card className="@container pb-0">
        <CardContent className="space-y-6">
          {NAMED_SECTIONS.map((section, index) => (
            <Fragment key={section}>
              {index > 0 && <Separator />}
              <SectionFields section={section} control={form.control} />
            </Fragment>
          ))}
        </CardContent>
        <SaveFooter pending={save.isPending} dirty={form.formState.isDirty} />
      </Card>
    </form>
  )
}

/** Les champs d'une section : son nom d'origine en titre, le français, puis l'anglais. */
function SectionFields({
  section,
  control,
}: {
  section: NamedSection
  control: Control<Values>
}) {
  const fr = defaultSectionNames.fr[section]
  const en = defaultSectionNames.en[section]
  const values = useWatch({ control, name: section })
  const field = (
    key: "name" | "le" | "du" | "en",
    label: string,
    placeholder: string,
    example: (form: string) => string
  ) => (
    <Controller
      name={`${section}.${key}`}
      control={control}
      render={({ field: input, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`section-${section}-${key}`}>{label}</FieldLabel>
          <Input
            {...input}
            id={`section-${section}-${key}`}
            maxLength={40}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
          />
          {/* L'exemple suit ce qui est écrit, sinon la forme d'origine. */}
          <FieldDescription>
            {example(values[key].trim() || placeholder)}
          </FieldDescription>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium">
        {labels.sections[section]}
      </legend>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">{labels.french}</div>
        <div className="grid gap-4 @lg:grid-cols-3">
          {field("name", labels.name, fr.name, labels.exampleName)}
          {field("le", labels.le, fr.le, labels.exampleLe)}
          {field("du", labels.du, fr.du, labels.exampleDu)}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">{labels.english}</div>
        <div className="grid gap-4 @lg:grid-cols-3">
          {field("en", labels.name, en.name, labels.exampleEn)}
        </div>
      </div>
    </fieldset>
  )
}
