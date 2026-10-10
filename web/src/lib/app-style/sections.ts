// Les sections de l'onglet « Charte graphique », dans l'ordre et par groupe : la colonne des
// sections (liens), la liste « Aller à la section » des écrans plus étroits, et les éléments du
// téléphone qui mènent à leur réglage.

import type { ReadabilityIssue } from "@/lib/app-style/problems"

export const styleSections = [
  { key: "darkMode", group: "colors" },
  { key: "colors", group: "colors" },
  { key: "roles", group: "colors" },
  { key: "tints", group: "elements" },
  { key: "badges", group: "elements" },
  { key: "buttons", group: "elements" },
  { key: "fields", group: "elements" },
  { key: "fonts", group: "text" },
  { key: "fontRoles", group: "text" },
  { key: "sizes", group: "text" },
  { key: "shapes", group: "shapes" },
  { key: "file", group: "shapes" },
] as const

export type StyleSection = (typeof styleSections)[number]["key"]
export type StyleSectionGroup = (typeof styleSections)[number]["group"]

/** Les groupes, dans l'ordre, avec leurs sections. */
export const styleSectionGroups = styleSections.reduce<
  { group: StyleSectionGroup; sections: StyleSection[] }[]
>((groups, { key, group }) => {
  const last = groups.at(-1)
  if (last?.group === group) last.sections.push(key)
  else groups.push({ group, sections: [key] })
  return groups
}, [])

/** L'ancre d'une section : « style-font-roles ». */
export function sectionAnchor(section: StyleSection): string {
  return `style-${section.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
}

/** Les sections où un texte se lit mal (un point orange devant leur lien). */
export function sectionsWithIssues(
  issues: readonly ReadabilityIssue[]
): Set<StyleSection> {
  const where: Record<ReadabilityIssue["kind"], StyleSection> = {
    role: "roles",
    tint: "tints",
    badge: "badges",
    button: "buttons",
  }
  return new Set(issues.map((issue) => where[issue.kind]))
}
