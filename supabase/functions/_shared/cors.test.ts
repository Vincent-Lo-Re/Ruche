import { assertEquals } from "@std/assert"
import { corsHeaders, isAllowedOrigin, originRules } from "./cors.ts"

const rules = originRules(
  " https://admin.example.com, https://ruche-admin.vercel.app,https://ruche-admin-*-equipe.vercel.app,",
)

Deno.test("origines autorisées", () => {
  for (
    const origin of [
      "https://admin.example.com",
      "https://ruche-admin.vercel.app",
      "https://ruche-admin-git-etape-2-connexion-equipe.vercel.app",
      "https://ruche-admin-a1b2c3d4e-equipe.vercel.app",
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ]
  ) {
    assertEquals(isAllowedOrigin(origin, rules), true, origin)
  }
})

Deno.test("origines refusées", () => {
  for (
    const origin of [
      null,
      "",
      "null",
      "http://admin.example.com",
      "https://admin.example.com.pirate.fr",
      "https://admin.example.com:8443",
      "https://autre.example.com",
      "https://example.com",
      "http://ruche-admin.vercel.app",
      "https://ruche-admin.vercel.app.pirate.fr",
      "https://pirate.fr/https://ruche-admin.vercel.app",
      "https://ruche-admin-x-autre-equipe-bis.vercel.app.pirate.fr",
      "https://ruche-admin-a.b-equipe.vercel.app",
      "https://autre-equipe.vercel.app",
      "http://127.0.0.1:3000",
      "http://localhost:5173.pirate.fr",
    ]
  ) {
    assertEquals(isAllowedOrigin(origin, rules), false, String(origin))
  }
})

Deno.test("adresses de l'installation : seules les origines https bien écrites comptent", () => {
  assertEquals(originRules(undefined), [])
  assertEquals(originRules(""), [])
  assertEquals(
    originRules("http://admin.example.com,https://admin.example.com/chemin,https://localhost"),
    [],
  )
  assertEquals(originRules("https://*.vercel.app,https://ruche.*.app"), [])
  assertEquals(originRules("https://Admin.Example.com").length, 1)
  assertEquals(isAllowedOrigin("https://admin.example.com", originRules("https://.*")), false)
})

Deno.test("sans adresses d'installation, seul le serveur de développement est accepté", () => {
  assertEquals(isAllowedOrigin("http://127.0.0.1:5173", []), true)
  assertEquals(isAllowedOrigin("https://admin.example.com", []), false)
})

Deno.test("en-têtes", () => {
  const allowed = corsHeaders("http://127.0.0.1:5173")
  assertEquals(allowed["Access-Control-Allow-Origin"], "http://127.0.0.1:5173")
  assertEquals(allowed["Access-Control-Allow-Methods"], "POST, OPTIONS")
  assertEquals(allowed.Vary, "Origin")
  assertEquals(allowed["Access-Control-Allow-Headers"].includes("authorization"), true)
  assertEquals(corsHeaders("https://pirate.fr"), { Vary: "Origin" })
})
