// Les couleurs des palettes de l'admin (lib/palettes.ts), tirées des thèmes de shadcn :
// apps/v4/registry/themes.ts du dépôt shadcn-ui/ui, à une version fixe (SHA ci-dessous), pour que
// les couleurs ne changent qu'en changeant cette version. Écrit src/lib/generated/palettes-data.ts.
// Lancer avec : cd web && npm run palettes:generate (réseau nécessaire).

import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const SHA = "4101ec98af37e2d812f859e3f540bceafbbc5200"
const URL_THEMES = `https://raw.githubusercontent.com/shadcn-ui/ui/${SHA}/apps/v4/registry/themes.ts`
const out = fileURLToPath(
  new URL("../src/lib/generated/palettes-data.ts", import.meta.url)
)

const source = await (await fetch(URL_THEMES)).text()
// Un tableau d'objets en TypeScript : Node le lit tel quel (types retirés), sans l'import du type.
const copy = join(mkdtempSync(join(tmpdir(), "palettes-")), "themes.ts")
writeFileSync(copy, source.replace(/^import .*$/m, ""))
const { THEMES } = await import(pathToFileURL(copy).href)

const bases = ["neutral", "stone", "zinc", "mauve", "olive", "mist", "taupe"]
// Le rayon et le menu ne suivent pas la palette : le menu est une carte sombre de la base.
const skipped = new Set([
  "radius",
  "sidebar",
  "sidebar-accent",
  "sidebar-accent-foreground",
])
const pick = (vars) =>
  Object.fromEntries(Object.entries(vars).filter(([key]) => !skipped.has(key)))
const pair = (theme) => ({
  light: pick(theme.cssVars.light),
  dark: pick(theme.cssVars.dark),
})

const base = {}
const accent = {}
for (const theme of THEMES) {
  if (bases.includes(theme.name)) base[theme.name] = pair(theme)
  else accent[theme.name] = pair(theme)
}

const json = (value) => JSON.stringify(value, null, 2)
writeFileSync(
  out,
  `// Généré par web/scripts/palettes-generate.mjs (npm run palettes:generate) depuis les thèmes de
// shadcn (shadcn-ui/ui@${SHA.slice(0, 7)}, apps/v4/registry/themes.ts). Ne pas modifier.

type Vars = Readonly<Record<string, string>>
type Pair = { light: Vars; dark: Vars }

export const baseThemes: Record<string, Pair> = ${json(base)}

export const accentThemes: Record<string, Pair> = ${json(accent)}
`
)
execFileSync("npx", ["prettier", "--write", out], { stdio: "inherit" })
console.log(
  `palettes:generate : ${Object.keys(base).length} bases, ${Object.keys(accent).length} accents.`
)
