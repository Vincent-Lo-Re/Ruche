// En-têtes CORS des fonctions « equipe » et « files » : seule l'admin peut les appeler depuis un
// navigateur.

// Les adresses de l'admin en ligne sont propres à chaque installation : le secret ADMIN_ORIGINS
// les donne, séparées par des virgules (`supabase secrets set`). Une étoile tient la place d'un
// morceau d'adresse sans point, pour les adresses de test créées par Vercel :
// « https://admin.example.com,https://ruche-*-equipe.vercel.app ».
// Le serveur de développement est toujours accepté.
const developmentOrigin = /^http:\/\/(127\.0\.0\.1|localhost):5173$/

// Une origine écrite en https, sans chemin ni port, dont aucun morceau n'est une étoile seule (elle
// ouvrirait la porte à tout un domaine) ; les autres sont ignorées.
const originShape = /^https:\/\/[a-z0-9*-]+(\.[a-z0-9*-]+)+$/
const bareStar = /(\/|\.)\*(\.|$)/

export function originRules(value: string | undefined): RegExp[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim().toLowerCase())
    .filter((origin) => originShape.test(origin) && !bareStar.test(origin))
    .map((origin) => new RegExp(`^${origin.replaceAll(".", "\\.").replaceAll("*", "[a-z0-9-]+")}$`))
}

const installationOrigins = originRules(Deno.env.get("ADMIN_ORIGINS"))

// En-têtes envoyés par supabase-js (liste reprise de « @supabase/supabase-js/cors »).
const allowedHeaders =
  "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage"

export function isAllowedOrigin(
  origin: string | null,
  rules: RegExp[] = installationOrigins,
): origin is string {
  return origin !== null &&
    (developmentOrigin.test(origin) || rules.some((pattern) => pattern.test(origin)))
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedOrigin(origin)) {
    return { Vary: "Origin" }
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": allowedHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}
