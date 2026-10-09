import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save } from "lucide-react"
import { Fragment } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { LoadState } from "@/components/load-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { adminBrandKey, saveSectionNames } from "@/lib/admin-identity"
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
 * français trois formes écrites à la main (le nom, avec « le », avec « du »), avec un exemple de
 * phrase, et en anglais le nom ; vides, le nom d'origine (en gris). « Enregistrer » dans le pied
 * gris ; la page se recharge ensuite pour que tous les textes les prennent (useAdminSectionNames).
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
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(sectionNamesSchema),
    defaultValues: toValues(names),
  })

  const save = useMutation({
    mutationFn: (values: Values) => saveSectionNames(fromValues(values)),
    onSuccess: async (_, values) => {
      form.reset(values)
      toast.success(labels.saved)
      // Les noms relus, la page se recharge (useAdminSectionNames).
      await queryClient.invalidateQueries({ queryKey: adminBrandKey })
    },
    onError: () => toast.error(texts.common.unexpected),
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
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={save.isPending || !form.formState.isDirty}
          >
            {save.isPending ? <Spinner /> : <Save aria-hidden />}
            {texts.common.save}
          </Button>
        </CardFooter>
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
    placeholder: string
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
          {field("name", labels.name, fr.name)}
          {field("le", labels.le, fr.le)}
          {field("du", labels.du, fr.du)}
        </div>
        <p className="text-xs text-muted-foreground">
          {labels.exampleFr(values.du || fr.du)}
        </p>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">{labels.english}</div>
        <div className="grid gap-4 @lg:grid-cols-3">
          {field("en", labels.name, en.name)}
        </div>
        <p className="text-xs text-muted-foreground">
          {labels.exampleEn(values.en || en.name)}
        </p>
      </div>
    </fieldset>
  )
}
