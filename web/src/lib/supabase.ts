import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être définies (voir .env.example)"
  )
}

// Typé avec le schéma de la base (npx supabase gen types typescript --local).
export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey
)

// Un second client d'Auth, sans session gardée : une vérification qui ouvrirait une nouvelle
// session (le code d'un changement d'adresse) ne remplace pas celle du membre, qui a passé la
// double vérification ; on relit ensuite celle-ci (refreshSession).
export const detachedAuth = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: "ruche-detached",
  },
}).auth
