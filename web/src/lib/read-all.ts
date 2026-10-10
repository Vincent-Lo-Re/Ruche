// La base ne renvoie que 1 000 lignes par demande (max_rows) : une liste se lit par tranches,
// jusqu'au bout, sans plafond silencieux (10/10/2026, pagination des listes).

const CHUNK = 1000

/**
 * Lit toutes les lignes d'une liste : `read(from, to)` demande une tranche (`.range(from, to)`),
 * dans un ordre complet (identifiant en dernier critère) pour que les tranches se suivent.
 * Renvoie le premier échec, sinon toutes les lignes.
 */
export async function readAll<
  R extends { data: unknown[] | null; error: unknown },
>(read: (from: number, to: number) => PromiseLike<R>): Promise<R> {
  const rows: unknown[] = []
  for (let from = 0; ; from += CHUNK) {
    const result = await read(from, from + CHUNK - 1)
    if (result.error || !result.data) return result
    rows.push(...result.data)
    if (result.data.length < CHUNK)
      return { ...result, data: rows as R["data"] }
  }
}
