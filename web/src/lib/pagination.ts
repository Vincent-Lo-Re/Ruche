/**
 * La pagination des listes de l'admin (10/10/2026, ADMIN § 7) : chaque liste est lue en entier
 * (la recherche et les filtres restent instantanés), et seule une page est montrée. Sans React.
 */

// Les lignes d'un tableau par page ; les fichiers de la Médiathèque, en grille comme en liste
// (48 tombe juste avec 2, 3, 4 ou 6 colonnes).
export const PAGE_SIZE = 25
export const MEDIA_PAGE_SIZE = 48

const PAGE = "page"

/** La page demandée dans l'adresse (?page=3), 1 sans réglage ou pour un mot qui n'en est pas une. */
export function pageFromAddress(params: URLSearchParams): number {
  const page = Number(params.get(PAGE))
  return Number.isInteger(page) && page > 1 ? page : 1
}

/** La page dans l'adresse : absente pour la première. */
export function writePage(params: URLSearchParams, page: number) {
  if (page <= 1) params.delete(PAGE)
  else params.set(PAGE, String(page))
}

/** Le nombre de pages (au moins une, même vide). */
export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size))
}

/** La page montrée : celle demandée, ramenée dans les pages qui existent. */
export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, page), pageCount(total, size))
}

/** Les éléments de cette page. */
export function pageSlice<T>(
  items: readonly T[],
  page: number,
  size: number
): T[] {
  const start = (clampPage(page, items.length, size) - 1) * size
  return items.slice(start, start + size)
}

/**
 * Les numéros à montrer : la première et la dernière page, la page montrée et ses voisines, et
 * « … » pour ce qui est sauté (jamais pour une seule page : elle est montrée à la place).
 * 7 places au plus : 1 … 4 5 6 … 20.
 */
export function pageNumbers(page: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1)
  // Près d'un bout, cinq numéros de ce côté : « … » cache toujours au moins deux pages.
  const [start, end] =
    page <= 4
      ? [2, 5]
      : page >= count - 3
        ? [count - 4, count - 1]
        : [page - 1, page + 1]
  const middle = Array.from(
    { length: end - start + 1 },
    (_, index) => start + index
  )
  return [
    1,
    ...(start > 2 ? (["gap"] as const) : []),
    ...middle,
    ...(end < count - 1 ? (["gap"] as const) : []),
    count,
  ]
}

/**
 * L'ordre de toute la liste après un rangement dans une page (glisser-déposer) : les éléments de
 * la page, dans leur nouvel ordre, à la place de ceux qu'elle montrait (à partir de `start`).
 */
export function withPageOrder(
  allIds: readonly string[],
  pageIds: readonly string[],
  start: number
): string[] {
  return [
    ...allIds.slice(0, start),
    ...pageIds,
    ...allIds.slice(start + pageIds.length),
  ]
}

/** L'ordre de toute la liste après « Mettre en tête » ou « Mettre à la fin ». */
export function movedTo(
  allIds: readonly string[],
  id: string,
  place: "top" | "bottom"
): string[] {
  const others = allIds.filter((other) => other !== id)
  return place === "top" ? [id, ...others] : [...others, id]
}
