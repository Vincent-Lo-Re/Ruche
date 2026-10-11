import type { LucideIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Un choix en icônes, leur nom dans l'infobulle : le thème de chacun (ThemeChoice), ou celui du
 * téléphone de l'écran de chargement de l'app et sa sortie (App mobile › Identité).
 */
export function IconToggleGroup<T extends string>({
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
