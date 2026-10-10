import { afterEach, describe, expect, it, vi } from "vitest"

import { memberAdminChoice, readStored, writeStored } from "@/lib/stored-choice"

const isColor = (value: unknown): value is "red" | "blue" =>
  value === "red" || value === "blue"

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("choix gardés sur le navigateur", () => {
  it("le choix du membre passe avant celui de l'admin, puis la valeur de départ", () => {
    const options = {
      memberKey: "m",
      adminKey: "a",
      isValid: isColor,
      fallback: "red" as const,
    }
    expect(memberAdminChoice(options).current).toBe("red")
    writeStored("a", "blue")
    expect(memberAdminChoice(options).current).toBe("blue")
    writeStored("m", "red")
    expect(memberAdminChoice(options).current).toBe("red")
    // Une valeur abîmée ne compte pas.
    writeStored("m", "vert")
    expect(memberAdminChoice(options).current).toBe("blue")
  })

  it("un stockage indisponible vaut un choix absent, sans erreur", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("indisponible")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("indisponible")
    })
    expect(readStored("x")).toBeNull()
    expect(writeStored("x", "1")).toBe(false)
  })
})
