import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router"

import {
  clampPage,
  pageCount,
  pageFromAddress,
  pageSlice,
  writePage,
} from "@/lib/pagination"

export type Pagination<T> = {
  // La page montrée (ramenée dans celles qui existent) et le nombre de pages.
  page: number
  count: number
  // Les éléments de la page, et leur place dans toute la liste (de 1).
  items: T[]
  from: number
  to: number
  total: number
  setPage: (page: number) => void
}

/**
 * Une page de `items` (déjà cherchés et filtrés), son numéro gardé dans l'adresse (?page=3).
 * resetKey : la recherche, les filtres ou l'onglet ; quand ils changent, on revient à la page 1.
 * active : faux quand la liste n'est pas montrée (l'onglet Catégories, sur la page du Blog, a sa
 * propre pagination) : elle ne touche alors pas à l'adresse.
 * Les réglages gardés dans l'adresse retirent eux-mêmes la page en s'écrivant (lib/address.ts) :
 * deux écritures de suite de l'adresse s'effaceraient l'une l'autre.
 */
export function usePagination<T>(
  items: readonly T[],
  size: number,
  resetKey: string,
  active = true
): Pagination<T> {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState(() => ({
    page: pageFromAddress(searchParams),
    key: resetKey,
  }))
  // Une autre recherche, un autre filtre : la première page (ajusté pendant le rendu).
  let asked = state.page
  if (state.key !== resetKey) {
    asked = 1
    setState({ page: 1, key: resetKey })
  }
  // Un réglage qui n'est pas dans l'adresse (catégories) : la page en part aussi.
  const stale = active && asked === 1 && searchParams.has("page")
  useEffect(() => {
    if (!stale) return
    setSearchParams(
      (params) => {
        const copy = new URLSearchParams(params)
        writePage(copy, 1)
        return copy
      },
      { replace: true }
    )
  }, [stale, setSearchParams])

  const setPage = useCallback(
    (next: number) => {
      setState((current) => ({ ...current, page: next }))
      setSearchParams(
        (params) => {
          const copy = new URLSearchParams(params)
          writePage(copy, next)
          return copy
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const page = clampPage(asked, items.length, size)
  const shown = pageSlice(items, page, size)
  const from = items.length === 0 ? 0 : (page - 1) * size + 1
  return {
    page,
    count: pageCount(items.length, size),
    items: shown,
    from,
    to: from === 0 ? 0 : from + shown.length - 1,
    total: items.length,
    setPage,
  }
}
