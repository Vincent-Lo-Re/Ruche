import { Plus } from "lucide-react"

import { NameInput } from "@/components/app-style/style-fields"
import { RemoveButton } from "@/components/app-style/sortable-entry"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  closestWeight,
  fontFamilies,
  fontStack,
  SYSTEM_FAMILY,
  weightsOf,
  type FontFamily,
} from "@/lib/app-style/fonts"
import {
  fontInUse,
  fontRoles,
  freeName,
  LINE_HEIGHT_RANGE,
  MAX_FONTS,
  MIN_FONTS,
  newFont,
  SIZE_RANGE,
  sizeRoles,
  type AppStyle,
  type StyleFont,
} from "@/lib/app-style/style"
import { texts } from "@/texts"

const labels = texts.appStyle

type Change = (update: (style: AppStyle) => AppStyle) => void

/** Un texte d'essai dans une police de la charte (chargée par l'onglet, @font-face). */
function FontSample({
  font,
  size,
  children,
}: {
  font: Pick<StyleFont, "family" | "weight">
  size?: number
  children: string
}) {
  return (
    <span
      className="truncate text-base"
      // eslint-disable-next-line no-restricted-syntax -- une police de la charte, choisie par le client
      style={{
        fontFamily: fontStack(font),
        fontWeight: font.weight,
        fontSize: size,
      }}
    >
      {children}
    </span>
  )
}

const familyLabel = (family: FontFamily) =>
  family === SYSTEM_FAMILY ? labels.fonts.system : family

/** Les polices : un nom, une famille et une épaisseur ; trois au moins. */
export function FontsCard({
  appStyle: style,
  change,
}: {
  appStyle: AppStyle
  change: Change
}) {
  const words = labels.fonts
  const update = (id: string, patch: Partial<StyleFont>) =>
    change((current) => ({
      ...current,
      fonts: current.fonts.map((font) =>
        font.id === id ? { ...font, ...patch } : font
      ),
    }))
  const familyItems = fontFamilies.map((family) => ({
    value: family,
    label: familyLabel(family),
  }))
  return (
    <Card className="pb-0">
      <CardContent>
        <ul className="grid gap-2">
          {style.fonts.map((font) => {
            const weightItems = weightsOf(font.family).map((weight) => ({
              value: String(weight),
              label: words.weights[weight],
            }))
            const blocked =
              style.fonts.length <= MIN_FONTS
                ? words.minFonts
                : fontInUse(style, font.id)
                  ? words.inUse
                  : null
            return (
              <li
                key={font.id}
                className="grid grid-cols-2 items-start gap-2 rounded-lg border p-2"
              >
                {/* Le nom, l'essai de la police, puis la gomme ; dessous, la famille et l'épaisseur. */}
                <div className="col-span-2 flex min-w-0 items-start gap-2">
                  <NameInput
                    value={font.name}
                    label={words.name}
                    others={style.fonts.filter((other) => other.id !== font.id)}
                    onChange={(name) => update(font.id, { name })}
                  />
                  <span className="flex h-10 max-w-28 items-center">
                    <FontSample font={font}>{words.sampleText}</FontSample>
                  </span>
                  <RemoveButton
                    label={words.remove(font.name)}
                    blocked={blocked}
                    onRemove={() =>
                      change((current) => ({
                        ...current,
                        fonts: current.fonts.filter((f) => f.id !== font.id),
                      }))
                    }
                  />
                </div>
                <Select
                  items={familyItems}
                  value={font.family}
                  onValueChange={(value) => {
                    const family = fontFamilies.find((f) => f === value)
                    if (family)
                      update(font.id, {
                        family,
                        weight: closestWeight(family, font.weight),
                      })
                  }}
                >
                  <SelectTrigger aria-label={words.family} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {familyItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  items={weightItems}
                  value={String(font.weight)}
                  onValueChange={(value) => {
                    const weight = weightsOf(font.family).find(
                      (w) => String(w) === value
                    )
                    if (weight) update(font.id, { weight })
                  }}
                >
                  <SelectTrigger aria-label={words.weight} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weightItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            )
          })}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          disabled={style.fonts.length >= MAX_FONTS}
          onClick={() =>
            change((current) => ({
              ...current,
              fonts: [
                ...current.fonts,
                newFont(freeName(words.newName, current.fonts)),
              ],
            }))
          }
        >
          <Plus aria-hidden />
          {words.add}
        </Button>
      </CardFooter>
    </Card>
  )
}

/** Où va chaque police : un choix parmi les polices, et un essai. */
export function FontRolesCard({
  appStyle: style,
  change,
}: {
  appStyle: AppStyle
  change: Change
}) {
  const items = style.fonts.map((font) => ({
    value: font.id,
    label: font.name,
  }))
  return (
    <Card>
      <CardContent>
        <ul className="grid gap-2">
          {fontRoles.map((role) => (
            <li
              key={role}
              className="grid grid-cols-style-role items-center gap-2"
            >
              <span className="text-sm">{labels.fontRoles.names[role]}</span>
              <Select
                items={items}
                value={style.fontRoles[role]}
                onValueChange={(value) => {
                  if (value !== null)
                    change((current) => ({
                      ...current,
                      fontRoles: { ...current.fontRoles, [role]: value },
                    }))
                }}
              >
                <SelectTrigger
                  aria-label={labels.fontRoles.names[role]}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** Un nombre tapé, gardé dans ses bornes (et arrondi au pas). */
function clamp(value: number, min: number, max: number, step: number) {
  const rounded = Math.round(value / step) * step
  return Math.min(max, Math.max(min, Number(rounded.toFixed(2))))
}

/** Les tailles du texte, en points, et leur interligne. */
export function SizesCard({
  appStyle: style,
  change,
}: {
  appStyle: AppStyle
  change: Change
}) {
  const words = labels.sizes
  const setSize = (
    role: (typeof sizeRoles)[number],
    patch: Partial<{ size: number; lineHeight: number }>
  ) =>
    change((current) => ({
      ...current,
      sizes: {
        ...current.sizes,
        [role]: { ...current.sizes[role], ...patch },
      },
    }))
  return (
    <Card>
      <CardContent>
        <ul className="grid gap-2">
          {sizeRoles.map((role) => {
            const size = style.sizes[role]
            return (
              <li
                key={role}
                className="grid grid-cols-style-size items-center gap-2"
              >
                <span className="text-sm">{words.names[role]}</span>
                <NumberField
                  label={words.sizeOf(words.names[role])}
                  value={size.size}
                  unit={words.points}
                  min={SIZE_RANGE.min}
                  max={SIZE_RANGE.max}
                  step={1}
                  onChange={(value) => setSize(role, { size: value })}
                />
                <NumberField
                  label={words.lineHeightOf(words.names[role])}
                  value={size.lineHeight}
                  min={LINE_HEIGHT_RANGE.min}
                  max={LINE_HEIGHT_RANGE.max}
                  step={LINE_HEIGHT_RANGE.step}
                  onChange={(value) => setSize(role, { lineHeight: value })}
                />
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

/** Un nombre : il change quand on quitte le champ, ramené dans ses bornes. */
function NumberField({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  unit?: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        // Une nouvelle valeur (Annuler, import) remplace ce qui est tapé.
        key={value}
        type="number"
        inputMode="decimal"
        aria-label={label}
        defaultValue={value}
        min={min}
        max={max}
        step={step}
        className="w-20"
        onBlur={(event) => {
          const typed = Number(event.target.value)
          if (event.target.value.trim() === "" || Number.isNaN(typed)) {
            event.target.value = String(value)
            return
          }
          const next = clamp(typed, min, max, step)
          event.target.value = String(next)
          if (next !== value) onChange(next)
        }}
      />
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
    </div>
  )
}
