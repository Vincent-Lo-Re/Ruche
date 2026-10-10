import { describe, expect, it } from "vitest"

import {
  clampPage,
  movedTo,
  pageCount,
  pageFromAddress,
  pageNumbers,
  pageSlice,
  withPageOrder,
  writePage,
} from "@/lib/pagination"

describe("pagination des listes", () => {
  it("lit et écrit la page dans l'adresse, absente pour la première", () => {
    expect(pageFromAddress(new URLSearchParams(""))).toBe(1)
    expect(pageFromAddress(new URLSearchParams("page=3"))).toBe(3)
    for (const word of ["0", "-2", "1.5", "trois"]) {
      expect(pageFromAddress(new URLSearchParams(`page=${word}`))).toBe(1)
    }
    const params = new URLSearchParams("q=sommeil")
    writePage(params, 2)
    expect(params.toString()).toBe("q=sommeil&page=2")
    writePage(params, 1)
    expect(params.toString()).toBe("q=sommeil")
  })

  it("coupe la liste en pages, et ramène une page qui n'existe plus", () => {
    const items = Array.from({ length: 60 }, (_, index) => index + 1)
    expect(pageCount(0, 25)).toBe(1)
    expect(pageCount(60, 25)).toBe(3)
    expect(pageSlice(items, 1, 25)).toEqual(items.slice(0, 25))
    expect(pageSlice(items, 3, 25)).toEqual([
      51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
    ])
    // Une recherche a réduit la liste : la dernière page qui existe.
    expect(clampPage(9, 60, 25)).toBe(3)
    expect(pageSlice(items, 9, 25)).toEqual(items.slice(50))
  })

  it("montre la première, la dernière, la page et ses voisines, « … » pour le reste", () => {
    expect(pageNumbers(1, 1)).toEqual([1])
    expect(pageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(pageNumbers(1, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20])
    expect(pageNumbers(5, 20)).toEqual([1, "gap", 4, 5, 6, "gap", 20])
    expect(pageNumbers(20, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20])
    // Jamais « … » pour une seule page sautée.
    expect(pageNumbers(4, 8)).toEqual([1, 2, 3, 4, 5, "gap", 8])
  })

  it("range une page dans toute la liste, et met un élément en tête ou à la fin", () => {
    const all = ["a", "b", "c", "d", "e", "f"]
    // La page 2 (de deux) montrait c et d : d passe devant.
    expect(withPageOrder(all, ["d", "c"], 2)).toEqual([
      "a",
      "b",
      "d",
      "c",
      "e",
      "f",
    ])
    expect(movedTo(all, "e", "top")).toEqual(["e", "a", "b", "c", "d", "f"])
    expect(movedTo(all, "b", "bottom")).toEqual(["a", "c", "d", "e", "f", "b"])
  })
})
