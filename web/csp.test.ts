import { describe, expect, it } from "vitest"
import { contentSecurityPolicy } from "./csp.ts"

const directive = (policy: string, name: string) =>
  policy.split("; ").find((d) => d.startsWith(`${name} `))

describe("contentSecurityPolicy", () => {
  it("permet la base en ligne de l'installation, son stockage et son temps réel", () => {
    const policy = contentSecurityPolicy("https://abcdefghij.supabase.co")
    expect(directive(policy, "connect-src")).toBe(
      "connect-src 'self' https://abcdefghij.supabase.co https://abcdefghij.storage.supabase.co wss://abcdefghij.supabase.co https://*.ingest.de.sentry.io"
    )
    expect(directive(policy, "img-src")).toBe(
      "img-src 'self' data: blob: https://abcdefghij.supabase.co"
    )
    expect(directive(policy, "media-src")).toBe(
      "media-src 'self' blob: https://abcdefghij.supabase.co"
    )
  })

  it("permet le Supabase local", () => {
    const policy = contentSecurityPolicy("http://127.0.0.1:54321")
    expect(directive(policy, "connect-src")).toBe(
      "connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321 https://*.ingest.de.sentry.io"
    )
  })

  it("sans adresse valable, rien d'autre que l'admin", () => {
    for (const url of [undefined, "", "pas une adresse", "ftp://exemple.com"]) {
      const policy = contentSecurityPolicy(url)
      expect(directive(policy, "img-src")).toBe("img-src 'self' data: blob:")
      expect(policy).not.toContain("supabase")
    }
  })

  it("garde les règles qui ne dépendent pas de l'installation", () => {
    const policy = contentSecurityPolicy("https://abcdefghij.supabase.co")
    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("script-src 'self'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).not.toContain("frame-ancestors")
  })
})
