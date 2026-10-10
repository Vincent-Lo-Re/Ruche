import { useQuery } from "@tanstack/react-query"

import { ListSelect } from "@/components/list-select"
import { LoadState } from "@/components/load-state"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { useBrandMutation } from "@/hooks/use-brand-name"
import { saveAdminFormat } from "@/lib/admin-identity"
import { formatSample } from "@/lib/dates"
import { language } from "@/lib/language"
import { adminBrandRead } from "@/lib/reads"
import {
  isRegionalFormat,
  languageFormat,
  REGIONAL_FORMATS,
  regionalFormatName,
  type RegionalFormat,
} from "@/lib/regional-format"
import { texts } from "@/texts"

const labels = texts.settings.advanced.format

// « Selon la langue » : pas de format choisi, celui de la langue de l'admin s'applique.
const LANGUAGE_CHOICE = "language"

/**
 * Le format régional de toute l'admin (onglet « Avancé » des Paramètres, admins) : l'écriture des
 * dates, des heures et des nombres, tant qu'un membre n'a pas choisi le sien dans Mon compte ; un
 * exemple sous la liste. L'identité de l'admin relue, useAdminSettings recharge la page s'il change.
 */
export function AdminFormatCard() {
  const brand = useQuery(adminBrandRead())
  const save = useBrandMutation({
    mutationFn: (format: RegionalFormat | null) => saveAdminFormat(format),
    saved: labels.saved,
  })

  return (
    <Card>
      <CardContent>
        {brand.isSuccess ? (
          <AdminFormatField
            chosen={save.isPending ? save.variables : brand.data.locale}
            // L'exemple sans format choisi : celui de la langue de qui regarde.
            fallback={languageFormat(language)}
            disabled={save.isPending}
            onChange={(next) => {
              if (next !== brand.data.locale) save.mutate(next)
            }}
          />
        ) : (
          <LoadState query={brand} rows={1} failed={texts.common.unexpected} />
        )}
      </CardContent>
    </Card>
  )
}

function AdminFormatField({
  chosen,
  fallback,
  disabled,
  onChange,
}: {
  chosen: RegionalFormat | null
  fallback: RegionalFormat
  disabled: boolean
  onChange: (next: RegionalFormat | null) => void
}) {
  const items = [
    {
      value: LANGUAGE_CHOICE,
      label: labels.sameAsLanguage,
    },
    ...REGIONAL_FORMATS.map((value) => ({
      value,
      label: regionalFormatName(value),
    })),
  ]
  return (
    <Field>
      <FieldLabel htmlFor="admin-format">{labels.label}</FieldLabel>
      <ListSelect
        id="admin-format"
        items={items}
        value={chosen ?? LANGUAGE_CHOICE}
        disabled={disabled}
        onValueChange={(value) =>
          onChange(isRegionalFormat(value) ? value : null)
        }
      />
      <FieldDescription>
        {texts.dates.sample(formatSample(chosen ?? fallback))}
      </FieldDescription>
    </Field>
  )
}
