import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Aucun CSS inutile ni en double (docs/BONNES-PRATIQUES.md, § 2) : chaque couleur ou mesure du
// thème, variable, utilitaire, classe et animation de nos feuilles de style sert quelque part, et
// aucun sélecteur n'est défini deux fois au même endroit.

// Les tests de l'admin tournent depuis web/ (npm test).
const src = join(process.cwd(), "src")

function files(dir: string, keep: (path: string) => boolean): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((file) => join(dir, file))
    .filter(keep)
}

const sheets = files(src, (path) => path.endsWith(".css")).map((path) => ({
  path,
  // Sans les commentaires.
  text: readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
}))
const code = files(
  src,
  (path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path)
)
  .map((path) => readFileSync(path, "utf8"))
  .join("\n")
const css = sheets.map((sheet) => sheet.text).join("\n")
const everything = `${code}\n${css}`

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
// Un nom de classe dans le code (avec une variante devant : lg:, hover:, @lg:…) ou dans un @apply.
const classUsed = (name: string) =>
  new RegExp(
    `(^|[\\s"'\`:!])${escape(name)}(\\/\\d+)?(?=$|[\\s"'\`;])`,
    "m"
  ).test(everything)

// Le contenu d'un bloc @theme, avec ses déclarations.
function themeTokens(): string[] {
  const block = /@theme[^{]*\{([^}]*)\}/g
  return [...css.matchAll(block)].flatMap(([, body]) =>
    [...body.matchAll(/--([a-z0-9-]+)\s*:/g)].map(([, name]) => name)
  )
}

// Une couleur ou une mesure du thème sert quand une classe Tailwind l'emploie, ou var(--…).
function themeTokenUsed(token: string): boolean {
  if (new RegExp(`var\\(--${escape(token)}\\)`).test(everything)) return true
  const [, family, name] =
    /^(color|radius|font|breakpoint)-(.+)$/.exec(token) ?? []
  if (!family) return true
  const prefixes = {
    color:
      "(bg|text|border(-[trblxy])?|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|accent|caret|shadow|placeholder)",
    radius: "rounded(-[trblse]{1,2})?",
    font: "font",
    breakpoint: "",
  }[family]
  if (family === "breakpoint")
    return new RegExp(`\\b${escape(name)}:`).test(code)
  return new RegExp(
    `(^|[\\s"'\`:!*])${prefixes}-${escape(name)}(\\/\\d+)?(?=$|[\\s"'\`;\\]])`,
    "m"
  ).test(everything)
}

describe("feuilles de style", () => {
  it("chaque couleur ou mesure du thème (@theme) sert", () => {
    expect(themeTokens().filter((token) => !themeTokenUsed(token))).toEqual([])
  })

  it("chaque variable CSS est lue quelque part", () => {
    const defined = new Set(
      [...css.matchAll(/(?:^|[;{\s])--([a-z0-9-]+)\s*:/g)].map(
        ([, name]) => name
      )
    )
    const theme = new Set(themeTokens())
    const unused = [...defined].filter((name) => {
      if (theme.has(name)) return false
      // Lue par var(--…), par Tailwind (h-(--…)) ou par le code (getPropertyValue("--…")).
      return !new RegExp(
        `(var\\(--${escape(name)}[,)]|\\(--${escape(name)}\\)|["'\`]--${escape(name)}["'\`])`
      ).test(everything)
    })
    expect(unused).toEqual([])
  })

  it("chaque utilitaire (@utility) et chaque animation (@keyframes) sert", () => {
    const utilities = [...css.matchAll(/@utility\s+([a-z0-9-]+)/g)].map(
      ([, name]) => name
    )
    const keyframes = [...css.matchAll(/@keyframes\s+([a-z0-9-]+)/g)].map(
      ([, name]) => name
    )
    expect([
      ...utilities.filter((name) => !classUsed(name)),
      ...keyframes.filter(
        (name) =>
          !new RegExp(`animation(-name)?:[^;]*\\b${escape(name)}\\b`).test(css)
      ),
    ]).toEqual([])
  })

  it("chaque classe de nos feuilles est employée par l'admin", () => {
    // Posées par une bibliothèque, pas par notre code : is-empty, le paragraphe vide de Tiptap
    // (extension Placeholder).
    const fromLibraries = new Set(["is-empty"])
    const classes = new Set(
      [...css.matchAll(/\.([a-z][a-z0-9-]*)(?=[\s,:.{[>+~)])/g)].map(
        ([, name]) => name
      )
    )
    expect(
      [...classes].filter(
        (name) =>
          !fromLibraries.has(name) && !classUsed(name) && !code.includes(name)
      )
    ).toEqual([])
  })

  it("aucun sélecteur n'est défini deux fois au même endroit", () => {
    const duplicates: string[] = []
    for (const { path, text } of sheets) {
      // Les règles de chaque niveau (racine, et chaque @media / @supports / @layer à part).
      const seen = new Map<string, number>()
      let depth = 0
      const context: string[] = []
      let start = 0
      for (let index = 0; index < text.length; index++) {
        const char = text[index]
        if (char === "{") {
          const head = text.slice(start, index).trim().split(";").pop()!.trim()
          if (head.startsWith("@")) context.push(head)
          else {
            const key = `${context.join(" > ")} | ${head.replace(/\s+/g, " ")}`
            if (depth === context.length && !/^(from|to|\d+%)/.test(head)) {
              seen.set(key, (seen.get(key) ?? 0) + 1)
            }
          }
          depth++
          start = index + 1
        } else if (char === "}") {
          depth--
          if (depth < context.length) context.pop()
          start = index + 1
        } else if (char === ";" && depth === context.length) {
          start = index + 1
        }
      }
      for (const [key, count] of seen) {
        if (count > 1) duplicates.push(`${path.slice(src.length + 1)} : ${key}`)
      }
    }
    expect(duplicates).toEqual([])
  })
})
