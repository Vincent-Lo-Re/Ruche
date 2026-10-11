import { useTheme } from "@/components/theme/theme-context"
import { themeOptions } from "@/components/theme/theme-options"
import { IconToggleGroup } from "@/components/icon-toggle-group"
import { texts } from "@/texts"

/** Clair, Sombre, Automatique : trois icônes, leur nom dans l'infobulle (en haut à droite de la carte Thème). */
export function ThemeChoice() {
  const { theme, setTheme } = useTheme()

  return (
    <IconToggleGroup
      label={texts.theme.title}
      options={themeOptions}
      value={theme}
      onChange={setTheme}
    />
  )
}
