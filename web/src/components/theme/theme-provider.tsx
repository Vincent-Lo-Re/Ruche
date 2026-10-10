import { useEffect, useState, type ReactNode } from "react"

import {
  isTheme,
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
} from "./theme-context"
import { readStored, writeStored } from "@/lib/stored-choice"

// Le choix est gardé sur le navigateur de chacun.
function readStoredTheme(): Theme {
  const stored = readStored(THEME_STORAGE_KEY)
  return isTheme(stored) ? stored : "system"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches)
      document.documentElement.classList.toggle("dark", dark)
    }

    apply()
    if (theme !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = (next: Theme) => {
    writeStored(THEME_STORAGE_KEY, next)
    setThemeState(next)
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}
