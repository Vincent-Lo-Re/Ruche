import { CircleAlert, CircleCheck } from "lucide-react"
import { useState } from "react"
import { HexColorPicker } from "react-colorful"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ReadabilityIssue } from "@/lib/app-style/problems"
import {
  colorValue,
  MAX_NAME,
  nameKey,
  type AppStyle,
  type StyleMode,
} from "@/lib/app-style/style"
import { formatDecimal } from "@/lib/media/format"
import { cn } from "cn"
import { texts } from "@/texts"

const labels = texts.appStyle

/** Un carré de la couleur d'une charte (choisie par le client : une valeur qui change en direct). */
function Swatch({
  color,
  className,
}: {
  color: string | null
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-4 shrink-0 rounded-sm border border-border",
        className
      )}
      // eslint-disable-next-line no-restricted-syntax -- une couleur de la charte, choisie par le client
      style={{ background: color ?? "transparent" }}
    />
  )
}

const HEX = /^#[0-9a-f]{6}$/

/**
 * La valeur d'une couleur : un bouton avec son carré et son code, qui ouvre un nuancier
 * (react-colorful) et le code à taper ou coller (« #9b3b5e »).
 */
export function ColorField({
  value,
  label,
  onChange,
}: {
  value: string
  label: string
  onChange: (value: string) => void
}) {
  const [typed, setTyped] = useState(value)
  const [open, setOpen] = useState(false)
  const typedValid = HEX.test(typed.trim().toLowerCase())
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setTyped(value)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={label}
            className="font-mono text-xs"
          />
        }
      >
        <Swatch color={value} />
        {value}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto space-y-3">
        <HexColorPicker
          color={value}
          onChange={(next) => {
            setTyped(next)
            onChange(next)
          }}
        />
        <div className="space-y-1">
          <Label htmlFor="style-hex">{labels.colors.hex}</Label>
          <Input
            id="style-hex"
            value={typed}
            aria-invalid={!typedValid}
            className="font-mono"
            onChange={(event) => {
              setTyped(event.target.value)
              const next = event.target.value.trim().toLowerCase()
              if (HEX.test(next)) onChange(next)
            }}
          />
          {!typedValid && (
            <p className="text-xs text-destructive">
              {labels.colors.hexInvalid}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Le choix d'une couleur de la palette, chacune avec son carré (dans le mode de l'aperçu). */
export function ColorSelect({
  appStyle: style,
  value,
  mode,
  label,
  onChange,
}: {
  appStyle: AppStyle
  value: string
  mode: StyleMode
  label: string
  onChange: (id: string) => void
}) {
  const items = style.colors.map((color) => ({
    value: color.id,
    label: color.name,
  }))
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <SelectTrigger aria-label={label} className="w-full min-w-0">
        <SelectValue>
          {(id: string) => (
            <>
              <Swatch color={colorValue(style, id, mode)} />
              <span className="truncate">
                {style.colors.find((color) => color.id === id)?.name}
              </span>
            </>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {style.colors.map((color) => (
          <SelectItem key={color.id} value={color.id}>
            <Swatch color={color[mode]} />
            {color.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Arrondi par défaut : un contraste de 4,46 ne s'affiche pas « 4,5 ».
const ratioText = (ratio: number) => formatDecimal(Math.floor(ratio * 10) / 10)

/** La lisibilité d'un réglage : « Peu lisible » (le détail dans l'infobulle), ou « Lisible ». */
export function ReadabilityBadge({
  issues,
  showReadable = false,
}: {
  issues: readonly ReadabilityIssue[]
  showReadable?: boolean
}) {
  if (issues.length === 0)
    return showReadable ? (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CircleCheck aria-hidden className="size-3.5" />
        {labels.roles.readable}
      </span>
    ) : null
  const detail = issues
    .map((issue) =>
      labels.readability.ratio(
        ratioText(issue.ratio),
        formatDecimal(issue.min),
        labels.readability[issue.mode]
      )
    )
    .join(" ")
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="outline" className="text-warning" tabIndex={0} />
        }
      >
        <CircleAlert aria-hidden />
        {labels.readability.hard}
        <span className="sr-only">{detail}</span>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  )
}

/** Ce qui ne va pas dans un nom : vide, trop long, ou déjà pris dans sa liste. */
function nameError(
  name: string,
  others: readonly { name: string }[]
): string | null {
  const trimmed = name.trim()
  if (!trimmed) return labels.names.empty
  if (trimmed.length > MAX_NAME) return labels.names.tooLong
  if (others.some((other) => nameKey(other.name) === nameKey(trimmed)))
    return labels.names.taken
  return null
}

/**
 * Le nom d'une couleur, d'une teinte, d'une pastille, d'un bouton ou d'une police : il change
 * quand on quitte le champ (ou Entrée), s'il est valable ; sinon il revient à l'ancien, et le
 * champ dit pourquoi.
 */
export function NameInput({
  value,
  others,
  label,
  onChange,
}: {
  value: string
  others: readonly { name: string }[]
  label: string
  onChange: (name: string) => void
}) {
  const [typed, setTyped] = useState<string | null>(null)
  const error = typed === null ? null : nameError(typed, others)
  const commit = () => {
    if (typed !== null && !error && typed.trim() !== value)
      onChange(typed.trim())
    setTyped(null)
  }
  return (
    <div className="min-w-0 flex-1">
      <Input
        value={typed ?? value}
        aria-label={label}
        aria-invalid={error !== null}
        maxLength={MAX_NAME + 10}
        onChange={(event) => setTyped(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit()
          if (event.key === "Escape") setTyped(null)
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
