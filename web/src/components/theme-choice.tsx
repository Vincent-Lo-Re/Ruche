import type { LucideIcon } from "lucide-react"

import { useTheme } from "@/components/theme/theme-context"
import { themeOptions } from "@/components/theme/theme-options"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { texts } from "@/texts"

/** Clair, Sombre, Automatique : trois icônes, leur nom dans l'infobulle (en haut à droite de la carte Thème). */
export function ThemeChoice() {
  const { theme, setTheme } = useTheme()

  return (
    <ThemeToggleGroup
      label={texts.theme.title}
      options={themeOptions}
      value={theme}
      onChange={setTheme}
    />
  )
}

/**
 * Des thèmes en icônes, leur nom dans l'infobulle : celui de chacun (ThemeChoice), ou celui d'un
 * aperçu (le téléphone de l'écran de chargement de l'app).
 */
export function ThemeToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string; icon: LucideIcon }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="icon"
      aria-label={label}
      value={[value]}
      onValueChange={(next: string[]) => {
        // Un clic sur le choix déjà actif ne le désélectionne pas.
        const chosen = options.find((option) => option.value === next[0])
        if (chosen) onChange(chosen.value)
      }}
    >
      {options.map(({ value: option, label: name, icon: Icon }) => (
        <Tooltip key={option}>
          <TooltipTrigger
            render={<ToggleGroupItem value={option} aria-label={name} />}
          >
            <Icon />
          </TooltipTrigger>
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}
