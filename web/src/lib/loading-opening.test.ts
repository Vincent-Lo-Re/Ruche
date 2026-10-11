import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  isLoadingExit,
  openingSteps,
  playOpening,
  type OpeningStep,
} from "@/lib/loading-opening"
import { motionLoop } from "@/lib/monogram-motion"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("l'ouverture de l'app", () => {
  it("un tour des animations, sans la dernière pause, puis la sortie et l'app", () => {
    const turn = motionLoop(null, ["sway", "breathe"])
    expect(openingSteps(turn, "zoom")).toEqual([
      { stage: "motions", phase: "sway", ms: 3_000 },
      { stage: "motions", phase: "rest", ms: 4_000 },
      { stage: "motions", phase: "breathe", ms: 3_200 },
      { stage: "exit", phase: "rest", ms: 800 },
      { stage: "app", phase: "rest", ms: 2_500 },
    ])
    // Immobile : la sortie tout de suite.
    expect(openingSteps([], "fade")[0]).toEqual({
      stage: "exit",
      phase: "rest",
      ms: 600,
    })
  })

  it("joue les étapes à leur heure, puis revient au chargement", () => {
    const seen: (OpeningStep | null)[] = []
    playOpening(openingSteps(motionLoop(null, ["sway"]), "fade"), (step) =>
      seen.push(step)
    )
    expect(seen.map((step) => step?.stage)).toEqual(["motions"])
    vi.advanceTimersByTime(2_999)
    expect(seen).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(seen.at(-1)?.stage).toBe("exit")
    vi.advanceTimersByTime(600)
    expect(seen.at(-1)?.stage).toBe("app")
    vi.advanceTimersByTime(2_500)
    expect(seen.at(-1)).toBeNull()
    vi.advanceTimersByTime(10_000)
    expect(seen).toHaveLength(4)
  })

  it("s'arrête quand on le demande (rejouée, ou la page quittée)", () => {
    const onStep = vi.fn()
    const stop = playOpening(openingSteps([], "zoom"), onStep)
    stop()
    vi.advanceTimersByTime(10_000)
    expect(onStep).toHaveBeenCalledTimes(1)
  })

  it("ne connaît que le fondu et le zoom", () => {
    expect(isLoadingExit("zoom")).toBe(true)
    expect(isLoadingExit("slide")).toBe(false)
  })
})
