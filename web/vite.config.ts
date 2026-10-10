import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { configDefaults } from "vitest/config"
import { contentSecurityPolicy } from "./csp.ts"

// Les règles de sécurité de l'admin construite, tirées de l'adresse de la base de l'installation
// (csp.ts). Seulement à la construction : le serveur de développement en a besoin d'autres.
function securityPolicy(): Plugin {
  let policy = ""
  return {
    name: "security-policy",
    apply: "build",
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || process.cwd(), "VITE_")
      policy = contentSecurityPolicy(env.VITE_SUPABASE_URL)
    },
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: policy },
        injectTo: "head-prepend",
      },
    ],
  }
}

// La version de l'admin (package.json), affichée en bas des pages avec le menu.
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), securityPolicy()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(version),
  },
  // Même adresse que site_url dans supabase/config.toml : les liens des e-mails
  // (invitation) et la session restent sur une seule origine.
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    // Pendant les tests seulement : les SVG types de la fonction « files » (même source pour
    // les tests du serveur et ceux de l'admin, voir src/lib/media/svg.test.ts) et les cas
    // partagés des blocs (src/blocks/validators.test.ts).
    ...(process.env.VITEST && {
      fs: {
        allow: [
          fileURLToPath(new URL(".", import.meta.url)),
          fileURLToPath(
            new URL("../supabase/functions/files/fixtures", import.meta.url)
          ),
          // Les cas partagés du schéma des blocs (lus aussi par pgTAP).
          fileURLToPath(new URL("../blocks/cases", import.meta.url)),
        ],
      },
    }),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Les textes sans espaces insécables (src/test/texts.ts) : voir la raison dans ce fichier.
    alias: [
      {
        find: /^@\/texts$/,
        replacement: fileURLToPath(
          new URL("./src/test/texts.ts", import.meta.url)
        ),
      },
    ],
    // Les tests de parcours (e2e/) tournent avec Playwright, pas avec Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
    // Valeurs fictives : les tests remplacent les appels à Supabase, rien ne part sur le réseau.
    // L'adresse vise un port fermé, jamais le Supabase local : une lecture qu'un test oublie de
    // simuler échoue sur l'ordinateur comme dans les garde-fous (après les nouvelles tentatives
    // de supabase-js, plusieurs secondes), au lieu de passer en local seulement.
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:9",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_tests",
    },
  },
})
