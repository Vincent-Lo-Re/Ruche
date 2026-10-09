import {
  ArchiveX,
  CircleUser,
  Images,
  Layers,
  LayoutDashboard,
  MicAudioLines,
  Rss,
  SlidersVertical,
  SquareText,
  UserGroup,
  type LucideIcon,
} from "lucide-react"

import type { ContentKind } from "@/lib/contents/api"
import { texts } from "@/texts"

export type SectionKey = keyof typeof texts.sections

// Adresse (en français) et icône de chaque section.
/**
 * La route des pages avec le menu (AppLayout) : d'une de ces pages à l'autre, seul leur contenu
 * passe en fondu, le menu ne bouge pas (ADMIN § 7, « Une navigation sans à-coups »).
 */
export const menuRouteId = "menu"

export const sections = {
  home: { path: "/", icon: LayoutDashboard },
  blog: { path: "/blog", icon: Rss },
  podcasts: { path: "/podcasts", icon: MicAudioLines },
  pages: { path: "/pages", icon: SquareText },
  templates: { path: "/templates", icon: Layers },
  media: { path: "/media", icon: Images },
  trash: { path: "/trash", icon: ArchiveX },
  team: { path: "/team", icon: UserGroup },
  settings: { path: "/settings", icon: SlidersVertical },
  account: { path: "/account", icon: CircleUser },
} satisfies Record<SectionKey, { path: string; icon: LucideIcon }>

// Pages de connexion, sans le menu.
export const authPaths = {
  signIn: "/sign-in",
  invitation: "/invitation",
  signOut: "/sign-out",
} as const

// Sections réservées aux admins : cachées dans le menu d'un éditeur.
export const adminOnlySections: readonly SectionKey[] = ["settings"]

// Rangement du menu de gauche : l'accueil, puis les groupes. Le compte, l'équipe et les
// paramètres sont dans le header (`header`).
export const menu = {
  top: ["home"],
  groups: [
    {
      label: texts.nav.groups.contents,
      items: ["blog", "podcasts", "pages"],
    },
    {
      label: texts.nav.groups.tools,
      items: ["templates", "media", "trash"],
    },
  ],
} satisfies {
  top: SectionKey[]
  groups: { label: string; items: SectionKey[] }[]
}

// Le menu du header, à gauche, après « Site web » (ADMIN § 7, « Un header sur toute la
// largeur ») ; Équipe et Paramètres pour les admins seulement.
export const header: SectionKey[] = ["account", "team", "settings"]

/** Adresse de l'éditeur d'un contenu : « /pages/<id> ». */
export function editorPath(section: SectionKey, contentId: string): string {
  return `${sections[section].path}/${contentId}`
}

// Section de l'éditeur de chaque sorte de contenu.
const editorSections: Record<ContentKind, SectionKey> = {
  article: "blog",
  episode: "podcasts",
  page: "pages",
  template: "templates",
}

/** Section d'un contenu d'après sa sorte. */
export function contentSection(kind: ContentKind): SectionKey {
  return editorSections[kind]
}

/** Adresse de l'éditeur d'un contenu d'après sa sorte. */
export function contentEditorPath(
  kind: ContentKind,
  contentId: string
): string {
  return editorPath(contentSection(kind), contentId)
}

/** La fiche d'un fichier dans la Médiathèque : « /media?file=<id> ». */
export function mediaFilePath(mediaId: string): string {
  return `${sections.media.path}?file=${encodeURIComponent(mediaId)}`
}

/** Vrai si l'adresse affichée appartient à la section (ou à l'une de ses pages). */
export function isInSection(path: string, pathname: string) {
  if (path === "/") return pathname === "/"
  return pathname === path || pathname.startsWith(`${path}/`)
}
