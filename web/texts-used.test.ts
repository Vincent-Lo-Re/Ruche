import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { en } from "./src/texts/en.ts"

// Aucun texte inutile (docs/BONNES-PRATIQUES.md, § 2 : « Quand on retire un usage, on retire
// aussi son texte ») : chaque texte de texts/en.ts est cité par l'admin ou ses parcours.

// Les tests de l'admin tournent depuis web/ (npm test).
const web = process.cwd()
const repo = join(web, "..")

function read(dir: string, keep: (path: string) => boolean): string {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((file) => join(dir, file))
    .filter(keep)
    .map((path) => readFileSync(path, "utf8"))
    .join("\n")
}

// Le code qui lit les textes : l'admin et ses parcours, hors des fichiers de textes eux-mêmes.
const code =
  read(
    join(web, "src"),
    (path) =>
      /\.tsx?$/.test(path) &&
      !/\/texts(\/|\.)/.test(path) &&
      !path.includes("texts-used")
  ) + read(join(web, "e2e"), (path) => /\.ts$/.test(path))

// Les messages choisis par le code d'une erreur de la base ou d'une fonction serveur
// (texts.editor.errors[code]…) : chacun doit répondre à un code que le serveur renvoie encore.
const serverCodeMaps = [
  "team.errors",
  "media.errors",
  "media.rejectReasons",
  "editor.errors",
  "publication.history.warnings",
  "publication.scheduleErrors",
  "categories.errors",
  "accessLevels.errors",
  "appStyle.errors",
]
const server =
  read(join(repo, "supabase", "migrations"), (path) => path.endsWith(".sql")) +
  read(
    join(repo, "supabase", "functions"),
    (path) => path.endsWith(".ts") && !path.endsWith(".test.ts")
  )

// Chaque texte (une chaîne ou une fonction), avec son chemin dans texts/en.ts.
function leaves(node: object, path: string[] = []): string[][] {
  return Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? leaves(value, [...path, key])
      : [[...path, key]]
  )
}

// Un texte est cité quand son nom apparaît comme propriété, chaîne, clé ou déstructuration.
function cited(name: string): boolean {
  return new RegExp(
    `(\\.${name}\\b|["'\`]${name}["'\`]|\\[${name}\\]|\\b${name}\\s*[,}:]|\\{\\s*${name}\\b)`
  ).test(code)
}

describe("textes de l'interface", () => {
  it("sont tous utilisés", () => {
    const unused = leaves(en).filter((path) => {
      const name = path[path.length - 1]
      // Un code d'erreur peut aussi être posé par l'admin elle-même (23505 → nom_en_double).
      if (serverCodeMaps.includes(path.slice(0, -1).join("."))) {
        return !server.includes(name) && !cited(name)
      }
      return !cited(name)
    })
    expect(unused.map((path) => path.join("."))).toEqual([])
  })
})
