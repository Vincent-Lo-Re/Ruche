import { useQuery } from "@tanstack/react-query"

import { ListSelect } from "@/components/list-select"
import { LoadState } from "@/components/load-state"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { useBrandMutation } from "@/hooks/use-brand-name"
import { saveAdminLanguage } from "@/lib/admin-identity"
import { isLanguage, LANGUAGES, type Language } from "@/lib/language"
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.settings.advanced.language

const items = LANGUAGES.map((value) => ({
  value,
  label: texts.languages[value],
}))

/**
 * La langue de toute l'admin (onglet « Avancé » des Paramètres, admins) : celle de l'équipe tant
 * qu'un membre n'a pas choisi la sienne dans Mon compte, et celle des pages de connexion.
 * L'identité de l'admin relue, useAdminSettings recharge la page si la langue change.
 */
export function AdminLanguageCard() {
  const brand = useQuery(adminBrandRead())
  const save = useBrandMutation({
    mutationFn: (language: Language) => saveAdminLanguage(language),
    saved: labels.saved,
  })

  return (
    <Card>
      <CardContent>
        {brand.isSuccess ? (
          <Field>
            <FieldLabel htmlFor="admin-language">{labels.label}</FieldLabel>
            <ListSelect
              id="admin-language"
              items={items}
              value={save.isPending ? save.variables : brand.data.language}
              disabled={save.isPending}
              onValueChange={(value) => {
                if (isLanguage(value) && value !== brand.data.language)
                  save.mutate(value)
              }}
            />
            <FieldDescription>{labels.hint}</FieldDescription>
          </Field>
        ) : (
          <LoadState query={brand} rows={1} failed={labels.loadFailed} />
        )}
      </CardContent>
    </Card>
  )
}
