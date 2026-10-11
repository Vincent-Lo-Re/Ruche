import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getAppBrand,
  identityWords,
  removeBrandFile,
  saveBrandDetails,
  saveBrandFile,
  saveMonogramMotions,
  saveOtherSurface,
  saveScreenImage,
  type PreparedBrandFile,
} from "@/lib/admin-identity"
import { texts } from "@/texts"

// Les mêmes écritures pour l'admin et pour l'app (App mobile › Identité, ADMIN § 1) : chacune va
// dans sa table et ses dossiers ; seule l'admin a des déclinaisons par palette.

const calls = vi.hoisted(() => ({
  updates: [] as { table: string; values: Record<string, unknown> }[],
  uploads: [] as string[],
  removed: [] as string[][],
  cleared: [] as string[],
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          calls.updates.push({ table, values })
          return { error: null }
        },
      }),
      delete: () => ({
        eq: () => ({
          select: async () => {
            calls.cleared.push(table)
            return { data: [], error: null }
          },
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async (path: string) => {
          calls.uploads.push(path)
          return { error: null }
        },
        remove: async (paths: string[]) => {
          calls.removed.push(paths)
          return { error: null }
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/${path}` },
        }),
      }),
    },
    rpc: () => ({
      single: async () => ({
        data: {
          name: "Essaim",
          initials: null,
          contact_email: null,
          website_url: null,
          logotype_light: "app-logotype-clair/a.svg",
          logotype_dark: null,
          monogram_light: null,
          monogram_dark: null,
          loading_image: "app-chargement/b.webp",
          loading_monogram_motion: true,
          loading_monogram_motions: ["sway", "inconnue"],
        },
        error: null,
      }),
    }),
  },
}))

beforeEach(() => {
  calls.updates.length = 0
  calls.uploads.length = 0
  calls.removed.length = 0
  calls.cleared.length = 0
})

const png: PreparedBrandFile = {
  body: new Blob(["x"], { type: "image/png" }),
  mime: "image/png",
  svg: null,
}
const uuid = "[0-9a-f-]{36}"

describe("l'identité de l'app", () => {
  it("se lit comme celle de l'admin, sans déclinaisons", async () => {
    const app = await getAppBrand()
    expect(app.name).toBe("Essaim")
    expect(app["logotype-light"]?.url).toBe(
      "https://cdn.test/app-logotype-clair/a.svg"
    )
    expect(app.screenImage?.path).toBe("app-chargement/b.webp")
    expect(app.monogramMotion).toBe(true)
    expect(app.monogramMotions).toEqual(["sway"])
    expect(app.variants).toEqual({})
  })

  it("s'écrit dans sa table, ses fichiers dans les dossiers « app-… »", async () => {
    await saveBrandDetails("app", {
      name: "Essaim",
      initials: null,
      contactEmail: null,
      websiteUrl: null,
    })
    await saveBrandFile(
      "app",
      "monogram-dark",
      png,
      "app-monogramme-sombre/x.png"
    )
    await saveScreenImage("app", new Blob(["x"], { type: "image/webp" }), null)
    await saveMonogramMotions("app", ["halo"])

    expect(calls.updates.map((update) => update.table)).toEqual([
      "app_identity",
      "app_identity",
      "app_identity",
      "app_identity",
    ])
    expect(calls.updates[1].values).toEqual({
      monogram_dark: expect.stringMatching(
        new RegExp(`^app-monogramme-sombre/${uuid}\\.png$`)
      ),
    })
    expect(calls.updates[2].values).toMatchObject({
      loading_image: expect.stringMatching(/^app-chargement\//),
    })
    expect(calls.updates[3].values).toMatchObject({
      loading_monogram_motions: ["halo"],
    })
    // Pas de déclinaisons à retirer pour l'app ; l'ancien fichier part.
    expect(calls.cleared).toEqual([])
    expect(calls.removed).toEqual([["app-monogramme-sombre/x.png"]])
  })

  it("la version pour l'autre fond d'un SVG va dans le dossier de l'app", async () => {
    const svg = {
      markup:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect fill="#111111" width="4" height="4"/></svg>',
      colors: { main: "#111111", accent: null },
    }
    await saveOtherSurface("app", svg, "logotype-dark")
    expect(calls.uploads[0]).toMatch(
      new RegExp(`^app-logotype-sombre/${uuid}\\.svg$`)
    )
    expect(calls.updates[0].table).toBe("app_identity")
  })

  it("l'admin garde ses tables, ses dossiers et ses déclinaisons", async () => {
    await saveBrandFile("admin", "logotype-light", png, null)
    await removeBrandFile("admin", "logotype-light", "logotype-clair/x.png")
    expect(calls.uploads[0]).toMatch(new RegExp(`^logotype-clair/${uuid}`))
    expect(calls.updates.map((update) => update.table)).toEqual([
      "admin_identity",
      "admin_identity",
    ])
    expect(calls.cleared).toEqual([
      "admin_brand_variants",
      "admin_brand_variants",
    ])
  })

  it("a ses propres mots : écran de chargement, usage de ses logos", () => {
    const admin = identityWords("admin")
    const app = identityWords("app")
    expect(admin.screen.title).toBe(
      texts.settings.adminIdentity.files.loginScreen.title
    )
    expect(app.screen.title).toBe(texts.appPages.identity.loadingScreen.title)
    expect(app.brand.title).toBe(admin.brand.title)
    expect(app.logos.uses.monogram).toBe(texts.appPages.identity.logos.monogram)
  })
})
