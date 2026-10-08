// Règles de sécurité du navigateur (Content Security Policy) de l'admin construite. Elles
// dépendent de l'installation : l'admin ne parle qu'à sa base (VITE_SUPABASE_URL), lue au moment
// de la construction. Sans adresse, rien d'autre que l'admin elle-même n'est permis.
// Elles partent dans une balise meta (vite.config.ts) ; frame-ancestors, ignoré par une balise
// meta, reste un en-tête de vercel.json.

export function contentSecurityPolicy(supabaseUrl: string | undefined): string {
  const supabase = supabaseSources(supabaseUrl)
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    ["img-src 'self' data: blob:", ...supabase.http].join(" "),
    ["media-src 'self' blob:", ...supabase.http].join(" "),
    "font-src 'self'",
    // Sentry, région Europe.
    [
      "connect-src 'self'",
      ...supabase.http,
      ...supabase.storage,
      ...supabase.realtime,
      "https://*.ingest.de.sentry.io",
    ].join(" "),
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ")
}

function supabaseSources(supabaseUrl: string | undefined) {
  const none = { http: [], storage: [], realtime: [] }
  if (!supabaseUrl) return none
  let url: URL
  try {
    url = new URL(supabaseUrl)
  } catch {
    return none
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return none
  const realtimeProtocol = url.protocol === "https:" ? "wss:" : "ws:"
  return {
    http: [url.origin],
    // Les envois reprenables passent par l'adresse de stockage d'un projet en ligne.
    storage: url.hostname.endsWith(".supabase.co")
      ? [
          `${url.protocol}//${url.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co")}`,
        ]
      : [],
    realtime: [`${realtimeProtocol}//${url.host}`],
  }
}
