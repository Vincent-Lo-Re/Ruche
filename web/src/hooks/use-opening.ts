import { useEffect, useRef, useState } from "react"

import {
  openingSteps,
  playOpening,
  type LoadingExit,
  type OpeningStep,
} from "@/lib/loading-opening"
import type { MotionPhase } from "@/lib/monogram-motion"

/**
 * L'ouverture de l'app rejouée dans l'aperçu du téléphone (lib/loading-opening.ts) : l'étape en
 * cours (null : l'écran de chargement, qui tourne seul), un numéro qui change à chaque lecture
 * (le monogramme repart du début) et de quoi la lancer. Elle s'arrête si la page se ferme.
 */
export function useOpening(
  turn: readonly { phase: MotionPhase; ms: number }[],
  exit: LoadingExit
) {
  const [step, setStep] = useState<OpeningStep | null>(null)
  const [run, setRun] = useState(0)
  const stop = useRef<(() => void) | null>(null)
  useEffect(() => () => stop.current?.(), [])
  const play = () => {
    stop.current?.()
    setRun((current) => current + 1)
    stop.current = playOpening(openingSteps(turn, exit), setStep)
  }
  return { step, run, play }
}
