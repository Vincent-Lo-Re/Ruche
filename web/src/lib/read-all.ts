// La base ne renvoie que 1 000 lignes par demande (max_rows) : une liste se lit par tranches,
// jusqu'au bout, sans plafond silencieux (10/10/2026, pagination des listes).

const CHUNK = 1000

/**
 * Lit toutes les lignes d'une liste : `read(from, to)` demande une tranche (`.range(from, to)`),
 * dans un ordre complet (identifiant en dernier critère) pour que les tranches se suivent.
 * Une ligne ajoutée ou retirée entre deux tranches décale la suivante : une ligne lue deux fois
 * (même `id`) n'est gardée qu'une fois. Renvoie le premier échec, sinon toutes les lignes.
 */
export async function readAll<
  R extends { data: unknown[] | null; error: unknown },
>(read: (from: number, to: number) => PromiseLike<R>): Promise<R> {
  const rows: unknown[] = []
  const seen = new Set<unknown>()
  for (let from = 0; ; from += CHUNK) {
    const result = await read(from, from + CHUNK - 1)
    if (result.error || !result.data) return result
    for (const row of result.data) {
      const id = (row as { id?: unknown } | null)?.id
      if (id === undefined) rows.push(row)
      else if (!seen.has(id)) {
        seen.add(id)
        rows.push(row)
      }
    }
    if (result.data.length < CHUNK)
      return { ...result, data: rows as R["data"] }
  }
}
