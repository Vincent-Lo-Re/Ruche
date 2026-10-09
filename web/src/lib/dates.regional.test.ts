import { afterAll, describe, expect, it, vi } from "vitest"

// Le format régional se lit au chargement (lib/regional-format.ts) : chaque format est chargé à
// neuf, la langue restant le français.
async function datesIn(format: string) {
  localStorage.setItem("ruche-format", format)
  vi.resetModules()
  return import("@/lib/dates")
}

afterAll(() => {
  localStorage.removeItem("ruche-format")
  vi.resetModules()
})

describe("le format régional, et non la langue, écrit les dates", () => {
  it("Royaume-Uni : le jour avant le mois, l'heure sur 24 heures", async () => {
    const dates = await datesIn("en-GB")
    expect(dates.formatDateTime("2026-09-27T12:30:00Z")).toBe(
      "27 Sept 2026, 14:30"
    )
    expect(dates.formatDayInput("2099-10-25")).toBe("25/10/2099")
    expect(dates.parseDayInput("25/10/2099")).toBe("2099-10-25")
    expect(dates.formatTimeInput("08:00")).toBe("08:00")
    expect(dates.parseTimeInput("14:30")).toBe("14:30")
    expect(dates.parseTimeInput("2:30 pm")).toBe("14:30")
  })

  it("Allemagne : des points entre le jour, le mois et l'année", async () => {
    const dates = await datesIn("de-DE")
    expect(dates.formatDayInput("2099-10-25")).toBe("25.10.2099")
    expect(dates.parseDayInput("25.10.2099")).toBe("2099-10-25")
    expect(dates.dayInputPlaceholder).toBe("jj.mm.aaaa")
  })

  it("Canada (anglais) : l'année d'abord à la saisie, comme le format l'écrit", async () => {
    const dates = await datesIn("en-CA")
    expect(dates.formatDayInput("2099-10-25")).toBe("2099-10-25")
    expect(dates.parseDayInput("2099-10-25")).toBe("2099-10-25")
  })
})
