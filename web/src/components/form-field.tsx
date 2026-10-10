import type { ReactNode } from "react"
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"

/** Ce que le champ reçoit pour être relié à son étiquette, son aide et son erreur. */
type FieldProps = {
  id: string
  "aria-invalid": boolean
  "aria-describedby"?: string
}

/**
 * Un champ d'un formulaire (react-hook-form) : son étiquette, le champ, l'aide dessous (hint) et
 * l'erreur de validation. render reçoit la valeur du formulaire (field) et ce qui relie le champ
 * à son étiquette, son aide et son état (props : id, aria-invalid, aria-describedby).
 */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  id,
  label,
  hint,
  className,
  render,
}: {
  control: Control<T>
  name: N
  id: string
  label: ReactNode
  hint?: ReactNode
  className?: string
  render: (field: ControllerRenderProps<T, N>, props: FieldProps) => ReactNode
}) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {render(field, {
            id,
            "aria-invalid": fieldState.invalid,
            "aria-describedby": hintId,
          })}
          {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
