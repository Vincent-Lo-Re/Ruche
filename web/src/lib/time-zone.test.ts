import { describe, expect, it } from "vitest"

import {
  isTimeZone,
  timeZoneCity,
  timeZoneNames,
  timeZoneOffset,
} from "@/lib/time-zone"

describe("fuseau horaire", () => {
  it("reconnaît un fuseau du navigateur, refuse le reste", () => {
    expect(isTimeZone("Europe/Paris")).toBe(true)
    expect(isTimeZone("Europe/Atlantide")).toBe(false)
    expect(isTimeZone("")).toBe(false)
    expect(isTimeZone(null)).toBe(false)
  })

  it("la ville et le décalage du jour", () => {
    expect(timeZoneCity("America/New_York")).toBe("New York")
    expect(timeZoneCity("UTC")).toBe("UTC")
    const summer = new Date("2026-07-01T12:00:00Z")
    expect(timeZoneOffset("Europe/Paris", summer)).toBe("UTC+02:00")
    expect(timeZoneOffset("America/Montreal", summer)).toBe("UTC−04:00")
    expect(timeZoneOffset("UTC", summer)).toBe("UTC")
  })

  it("la liste contient le fuseau choisi, même si le navigateur ne le donne pas", () => {
    expect(timeZoneNames("Europe/Paris")).toContain("Europe/Paris")
    expect(timeZoneNames("America/Montreal")).toContain("America/Montreal")
  })
})
