// Ce que les fonctions « equipe » et « files » partagent : les clés de la plateforme, les
// réponses en JSON et les erreurs qui deviennent une réponse.

/** Une erreur qui devient une réponse : son statut HTTP, son code et son message. */
export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
  }
}

// Clés fournies par la plateforme (en ligne et en local) : un dictionnaire JSON { default: "…" }.
// Repli sur les anciennes variables si besoin.
export function readKey(dictionaryVariable: string, legacyVariable: string): string {
  const dictionary = Deno.env.get(dictionaryVariable)
  if (dictionary) {
    const key = (JSON.parse(dictionary) as Record<string, string>).default
    if (key) return key
  }
  const legacy = Deno.env.get(legacyVariable)
  if (legacy) return legacy
  throw new Error(`Variable manquante : ${dictionaryVariable}`)
}

/** Une réponse en JSON, avec les en-têtes donnés (CORS). */
export function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  })
}
