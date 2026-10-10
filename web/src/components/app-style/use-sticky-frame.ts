import { useEffect, useState } from "react"

import { useAppTabActions } from "@/components/app-tab-actions"

/**
 * Ce qui reste en haut de l'onglet « Charte graphique » pendant que les réglages défilent (la
 * colonne des sections, le téléphone) : collé sous la ligne des onglets, de toute la hauteur
 * visible du panneau de la page qui reste (data-page-scroll). Relu quand la fenêtre change.
 */
export function useStickyFrame() {
  const { bar } = useAppTabActions()
  const [frame, setFrame] = useState<{ top: number; height: number } | null>(
    null
  )
  useEffect(() => {
    const panel = bar?.closest<HTMLElement>("[data-page-scroll]")
    if (!bar || !panel) return
    const measure = () =>
      setFrame({
        top: bar.offsetHeight,
        height: panel.clientHeight - bar.offsetHeight,
      })
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [bar])
  return frame
}
