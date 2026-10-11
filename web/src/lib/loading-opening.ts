// L'ouverture de l'app (App mobile › Identité, ADMIN § 1) : son écran de chargement, puis sa
// sortie, un fondu (au départ) ou un zoom (le monogramme grossit et s'ouvre sur l'app). Quand
// l'app est prête, le tour d'animation en cours se finit, sans recommencer, puis la sortie se
// joue. L'aperçu du téléphone la rejoue : un tour des animations, la sortie, le premier écran de
// l'app un moment, puis de nouveau l'écran de chargement. Sans React.

import type { MotionPhase } from "@/lib/monogram-motion"

/** Les sorties, dans l'ordre du choix (colonne app_identity.loading_exit). */
const LOADING_EXITS = ["fade", "zoom"] as const

export type LoadingExit = (typeof LOADING_EXITS)[number]

/** Le départ : le fondu. */
export const DEFAULT_EXIT: LoadingExit = "fade"

export const isLoadingExit = (value: unknown): value is LoadingExit =>
  (LOADING_EXITS as readonly unknown[]).includes(value)

/** La durée de chaque sortie, en millisecondes : celle de son animation (preview.css). */
const EXIT_MS: Record<LoadingExit, number> = { fade: 600, zoom: 800 }

/** Le premier écran de l'app reste ce temps-là dans l'aperçu, avant de revenir au chargement. */
const APP_MS = 2_500

/** Une étape de l'ouverture : les animations (et leur phase), la sortie, puis l'app. */
export type OpeningStep = {
  stage: "motions" | "exit" | "app"
  phase: MotionPhase
  ms: number
}

/**
 * Les étapes de l'ouverture : un tour des animations (`turn`, motionLoop ; vide pour un monogramme
 * immobile), sans la pause qui le finit, puis la sortie choisie et le premier écran de l'app.
 */
export function openingSteps(
  turn: readonly { phase: MotionPhase; ms: number }[],
  exit: LoadingExit
): OpeningStep[] {
  const motions = turn.at(-1)?.phase === "rest" ? turn.slice(0, -1) : turn
  return [
    ...motions.map(({ phase, ms }) => ({
      stage: "motions" as const,
      phase,
      ms,
    })),
    { stage: "exit", phase: "rest", ms: EXIT_MS[exit] },
    { stage: "app", phase: "rest", ms: APP_MS },
  ]
}

/**
 * Joue les étapes l'une après l'autre : `onStep` reçoit chacune à son tour, puis null à la fin
 * (de retour sur l'écran de chargement). Rend de quoi l'arrêter.
 */
export function playOpening(
  steps: readonly OpeningStep[],
  onStep: (step: OpeningStep | null) => void
): () => void {
  let index = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const next = () => {
    const step = steps[index++]
    onStep(step ?? null)
    if (step) timer = setTimeout(next, step.ms)
  }
  next()
  return () => clearTimeout(timer)
}
