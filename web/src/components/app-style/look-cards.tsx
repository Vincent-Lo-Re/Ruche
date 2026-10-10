import { Download, Upload } from "lucide-react"
import { useRef } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { parseStyleFile, styleFile } from "@/lib/app-style/file"
import { RADIUS_RANGE, type AppStyle } from "@/lib/app-style/style"
import { texts } from "@/texts"

const labels = texts.appStyle

type Change = (update: (style: AppStyle) => AppStyle) => void

/** Un choix parmi quelques-uns, en boutons accolés (ToggleGroup de shadcn). */
function Choices<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string
  value: T
  choices: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <ToggleGroup
      variant="outline"
      aria-label={label}
      value={[value]}
      onValueChange={(next: string[]) => {
        // Un clic sur le choix déjà actif ne le désélectionne pas.
        const choice = choices.find((c) => c.value === next[0])
        if (choice) onChange(choice.value)
      }}
      className="flex-wrap"
    >
      {choices.map((choice) => (
        <ToggleGroupItem key={choice.value} value={choice.value}>
          {choice.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

const darkModes = ["auto", "light", "dark"] as const

/** Le mode sombre : suivre le téléphone, ou rester toujours clair ou toujours sombre. */
export function DarkModeCard({
  appStyle: style,
  change,
}: {
  appStyle: AppStyle
  change: Change
}) {
  const words = labels.darkMode
  return (
    <Card>
      <CardContent>
        <Choices
          label={words.label}
          value={style.darkMode}
          choices={darkModes.map((mode) => ({
            value: mode,
            label: words[mode],
          }))}
          onChange={(darkMode) =>
            change((current) => ({ ...current, darkMode }))
          }
        />
      </CardContent>
    </Card>
  )
}

const fieldStyles = ["outline", "filled", "underline"] as const

/** Le style des champs où le lecteur écrit. */
export function FieldsCard({
  appStyle: style,
  change,
}: {
  appStyle: AppStyle
  change: Change
}) {
  const words = labels.fields
  return (
    <Card>
      <CardContent>
        <Choices
          label={words.label}
          value={style.fields}
          choices={fieldStyles.map((field) => ({
            value: field,
            label: words[field],
          }))}
          onChange={(fields) => change((current) => ({ ...current, fields }))}
        />
      </CardContent>
    </Card>
  )
}

const shadows = ["none", "light", "medium", "strong"] as const

/** Les arrondis, les ombres des cartes et les liens. */
export function ShapesCard({
  appStyle: style,
  change,
}: {
  appStyle: AppStyle
  change: Change
}) {
  const words = labels.shapes
  const radius = (key: "radius" | "imageRadius", label: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label id={`style-${key}`}>{label}</Label>
        <span className="text-sm text-muted-foreground tabular-nums">
          {words.points(style[key])}
        </span>
      </div>
      <Slider
        aria-labelledby={`style-${key}`}
        min={RADIUS_RANGE.min}
        max={RADIUS_RANGE.max}
        step={1}
        value={style[key]}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value[0] : value
          if (typeof next === "number")
            change((current) => ({ ...current, [key]: next }))
        }}
      />
    </div>
  )
  return (
    <Card>
      <CardContent className="space-y-5">
        {radius("radius", words.radius)}
        {radius("imageRadius", words.imageRadius)}
        <div className="space-y-2">
          <Label>{words.shadow}</Label>
          <Choices
            label={words.shadow}
            value={style.shadow}
            choices={shadows.map((shadow) => ({
              value: shadow,
              label: words.shadows[shadow],
            }))}
            onChange={(shadow) => change((current) => ({ ...current, shadow }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{words.links}</Label>
          <Choices
            label={words.links}
            value={style.underlineLinks ? "underlined" : "plain"}
            choices={[
              { value: "underlined", label: words.underlined },
              { value: "plain", label: words.plain },
            ]}
            onChange={(value) =>
              change((current) => ({
                ...current,
                underlineLinks: value === "underlined",
              }))
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}

/** Exporter la charte du brouillon, ou en importer une (elle remplace le brouillon). */
export function FileCard({
  appStyle: style,
  change,
}: {
  appStyle: AppStyle
  change: Change
}) {
  const words = labels.file
  const input = useRef<HTMLInputElement>(null)
  return (
    <Card>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const link = document.createElement("a")
            link.href = URL.createObjectURL(styleFile(style))
            link.download = words.fileName
            link.click()
            URL.revokeObjectURL(link.href)
          }}
        >
          <Download aria-hidden />
          {words.export}
        </Button>
        <Button variant="outline" onClick={() => input.current?.click()}>
          <Upload aria-hidden />
          {words.import}
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            const result = parseStyleFile(await file.text())
            if ("problems" in result) {
              toast.error(words.invalid)
              return
            }
            change(() => result.style)
            toast.success(words.imported)
          }}
        />
      </CardContent>
    </Card>
  )
}
