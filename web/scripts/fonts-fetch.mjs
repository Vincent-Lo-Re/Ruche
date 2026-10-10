// Les polices libres que la charte de l'app propose (ADMIN § 1, « Charte graphique ») :
// node scripts/fonts-fetch.mjs, seulement quand la liste des familles change.
//
// Lit les familles de la variante « style » de blocks/blocks.schema.json (sauf « system », la
// police du téléphone). Pour chacune, demande à Google Fonts chaque épaisseur de 400 à 700 et
// garde celles qui existent, en TrueType (une police par épaisseur, que lisent le navigateur et
// l'app), avec sa licence (OFL) tirée du dépôt google/fonts. Écrit :
//   - public/fonts/<famille>/<épaisseur>.ttf et public/fonts/<famille>/OFL.txt ;
//   - public/fonts/fonts.json : { "<famille>": [400, 700], … }, les épaisseurs disponibles.
// Ce script est le seul à appeler Google : l'admin sert ses propres fichiers, et les copie dans le
// stockage de l'installation (espace « polices ») à la publication de la charte ; l'app les y lit.

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const repo = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const out = fileURLToPath(new URL("../public/fonts/", import.meta.url))
const WEIGHTS = [400, 500, 600, 700]

const schema = JSON.parse(
  readFileSync(repo("blocks/blocks.schema.json"), "utf8")
)
const families = schema.definitions.styleFont.properties.family.enum.filter(
  (family) => family !== "system"
)

// Le dossier d'une famille, comme le chemin que vérifie la base : « Source Serif 4 » →
// « source-serif-4 ».
const slug = (family) => family.toLowerCase().replaceAll(" ", "-")

const fail = (message) => {
  console.error(`fonts-fetch : ${message}`)
  process.exit(1)
}

const download = async (url) => {
  const response = await fetch(url)
  if (!response.ok) fail(`${url} : ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

rmSync(out, { recursive: true, force: true })
const manifest = {}
for (const family of families) {
  const dir = `${out}${slug(family)}/`
  mkdirSync(dir, { recursive: true })
  manifest[family] = []
  for (const weight of WEIGHTS) {
    // Sans navigateur reconnu, Google répond en TrueType, sans découpage par alphabet.
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`
    )
    if (css.status === 400) continue
    if (!css.ok) fail(`${family} ${weight} : ${css.status}`)
    const url = (await css.text()).match(/url\((https:[^)]+\.ttf)\)/)?.[1]
    if (!url) fail(`${family} ${weight} : pas de fichier TrueType`)
    writeFileSync(`${dir}${weight}.ttf`, await download(url))
    manifest[family].push(weight)
  }
  if (manifest[family].length === 0) fail(`${family} : aucune épaisseur`)
  const licence = family.toLowerCase().replaceAll(" ", "")
  writeFileSync(
    `${dir}OFL.txt`,
    await download(
      `https://raw.githubusercontent.com/google/fonts/main/ofl/${licence}/OFL.txt`
    )
  )
  console.log(`fonts-fetch : ${family} (${manifest[family].join(", ")})`)
}
writeFileSync(`${out}fonts.json`, `${JSON.stringify(manifest, null, 2)}\n`)
execFileSync(
  "npx",
  [
    "--no",
    "--",
    "prettier",
    "--write",
    "--log-level",
    "warn",
    `${out}fonts.json`,
  ],
  { stdio: "inherit" }
)
