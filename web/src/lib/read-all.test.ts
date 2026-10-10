import { describe, expect, it } from "vitest"

import { readAll } from "@/lib/read-all"

describe("readAll", () => {
  it("lit par tranches de 1 000 jusqu'au bout, et garde une seule fois une ligne lue deux fois", async () => {
    const rows = Array.from({ length: 1500 }, (_, id) => ({ id }))
    const asked: [number, number][] = []
    const result = await readAll((from, to) => {
      asked.push([from, to])
      // Une ligne ajoutée avant la seconde tranche la décale d'une ligne : 999 revient.
      const slice = from === 0 ? rows.slice(0, 1000) : rows.slice(999, 1500)
      return Promise.resolve({ data: slice, error: null })
    })
    expect(asked).toEqual([
      [0, 999],
      [1000, 1999],
    ])
    expect(result.data).toHaveLength(1500)
    expect(new Set(result.data!.map((row) => row.id)).size).toBe(1500)
  })

  it("rend le premier échec", async () => {
    const error = new Error("réseau")
    const result = await readAll(() => Promise.resolve({ data: null, error }))
    expect(result.error).toBe(error)
  })
})
