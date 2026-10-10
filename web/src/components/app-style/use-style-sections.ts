import { useCallback, useEffect, useState } from "react"

import { useAppTabActions } from "@/components/app-tab-actions"
import {
  sectionAnchor,
  styleSections,
  type StyleSection,
} from "@/lib/app-style/sections"

// L'air laissé sous la ligne des onglets quand on va à une section.
const GAP = 16
// La durée du fond qui s'allume sur la section atteinte (data-returned d'index.css).
const HIGHLIGHT_MS = 1600

/**
 * Les sections de l'onglet « Charte graphique » : celle qu'on lit (la dernière dont le haut est
 * passé sous la ligne des onglets, relue quand le panneau de la page défile), et aller à une
 * section : le panneau défile jusqu'à elle (sans animation si l'ordinateur en demande moins), le
 * focus y va, et son fond s'allume un instant.
 */
export function useStyleSections() {
  const { bar } = useAppTabActions()
  const [current, setCurrent] = useState<StyleSection>(styleSections[0].key)

  useEffect(() => {
    const panel = bar?.closest<HTMLElement>("[data-page-scroll]")
    if (!bar || !panel) return
    const read = () => {
      const limit =
        panel.getBoundingClientRect().top + bar.offsetHeight + GAP * 2
      let reached: StyleSection = styleSections[0].key
      for (const { key } of styleSections) {
        const element = document.getElementById(sectionAnchor(key))
        if (element && element.getBoundingClientRect().top <= limit)
          reached = key
      }
      setCurrent(reached)
    }
    read()
    panel.addEventListener("scroll", read, { passive: true })
    return () => panel.removeEventListener("scroll", read)
  }, [bar])

  const go = useCallback(
    (section: StyleSection) => {
      const panel = bar?.closest<HTMLElement>("[data-page-scroll]")
      const element = document.getElementById(sectionAnchor(section))
      if (!bar || !panel || !element) return
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      // jsdom (les tests) ne fait pas défiler.
      panel.scrollTo?.({
        top:
          panel.scrollTop +
          element.getBoundingClientRect().top -
          panel.getBoundingClientRect().top -
          bar.offsetHeight -
          GAP,
        behavior: reduced ? "auto" : "smooth",
      })
      element.focus({ preventScroll: true })
      element.setAttribute("data-returned", "")
      window.setTimeout(
        () => element.removeAttribute("data-returned"),
        HIGHLIGHT_MS
      )
      setCurrent(section)
    },
    [bar]
  )

  return { current, go }
}
