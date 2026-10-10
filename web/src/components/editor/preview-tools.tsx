import { ALargeSmall, Moon, Sun, type LucideIcon } from "lucide-react"
import type { ComponentType, ReactNode, Ref, SVGProps } from "react"

import { AndroidLogo, AppleLogo } from "@/components/brand-icons"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  chosenValue,
  devices,
  previewThemes,
  type PreviewSettings,
} from "@/lib/editor/preview"
import { texts } from "@/texts"

const labels = texts.editor.preview

// Une icône Lucide, ou l'un des deux logos de marque (iPhone, Android).
type Icon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>
export type ToolChoices<T extends string> = Record<
  T,
  { label: string; icon: Icon }
>

/**
 * La barre verticale à droite d'un téléphone (éditeur des contenus, charte de l'app) : une icône
 * par choix, son sens dans l'infobulle.
 */
export function PreviewToolbar({
  ref,
  children,
}: {
  // La barre mesurée (la charte de l'app réduit le téléphone pour la garder à côté).
  ref?: Ref<HTMLDivElement>
  children: ReactNode
}) {
  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={labels.tools}
      aria-orientation="vertical"
      className="flex shrink-0 flex-col items-center gap-1 self-start rounded-lg border bg-background p-1 shadow-xs"
    >
      {children}
    </div>
  )
}

/** Un choix parmi quelques-uns, en icônes empilées. */
export function ToolGroup<T extends string>({
  label,
  values,
  choices,
  value,
  onChange,
}: {
  label: string
  values: readonly T[]
  choices: ToolChoices<T>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <ToggleGroup
      aria-label={label}
      orientation="vertical"
      className="flex-col"
      value={[value]}
      onValueChange={(next: string[]) => {
        const chosen = chosenValue(values, next)
        if (chosen) onChange(chosen)
      }}
    >
      {values.map((candidate) => {
        const { label: itemLabel, icon: Icon } = choices[candidate]
        return (
          <Tooltip key={candidate}>
            <TooltipTrigger
              render={
                <ToggleGroupItem
                  value={candidate}
                  size="icon"
                  aria-label={itemLabel}
                />
              }
            >
              <Icon />
            </TooltipTrigger>
            <TooltipContent side="left">{itemLabel}</TooltipContent>
          </Tooltip>
        )
      })}
    </ToggleGroup>
  )
}

const deviceChoices: ToolChoices<(typeof devices)[number]> = {
  ios: { label: labels.device.ios, icon: AppleLogo },
  android: { label: labels.device.android, icon: AndroidLogo },
}

const themeChoices: ToolChoices<(typeof previewThemes)[number]> = {
  light: { label: labels.theme.light, icon: Sun },
  dark: { label: labels.theme.dark, icon: Moon },
}

/** L'appareil : iPhone ou Android. */
export function DeviceTool({
  value,
  onChange,
}: {
  value: PreviewSettings["device"]
  onChange: (device: PreviewSettings["device"]) => void
}) {
  return (
    <ToolGroup
      label={labels.device.label}
      values={devices}
      choices={deviceChoices}
      value={value}
      onChange={onChange}
    />
  )
}

/** Le thème du téléphone : clair ou sombre. */
export function ThemeTool({
  value,
  onChange,
}: {
  value: PreviewSettings["theme"]
  onChange: (theme: PreviewSettings["theme"]) => void
}) {
  return (
    <ToolGroup
      label={labels.theme.label}
      values={previewThemes}
      choices={themeChoices}
      value={value}
      onChange={onChange}
    />
  )
}

/** Le grand texte du téléphone. */
export function LargeTextTool({
  pressed,
  onChange,
}: {
  pressed: boolean
  onChange: (largeText: boolean) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            size="icon"
            aria-label={labels.largeText}
            pressed={pressed}
            onPressedChange={onChange}
          />
        }
      >
        <ALargeSmall />
      </TooltipTrigger>
      <TooltipContent side="left">{labels.largeText}</TooltipContent>
    </Tooltip>
  )
}
