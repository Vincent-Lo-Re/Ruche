import { texts } from "@/texts"

/**
 * La forme comparée d'un titre ou d'un nom (doublons) : comme la base (private.title_key),
 * NFC, espaces du bord retirés, ceux du milieu réduits à un seul, en minuscules ; les accents
 * comptent.
 */
export function sameNameKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase()
}

/** Le titre affiché d'un contenu, d'un modèle ou d'un élément : « Sans titre » s'il est vide. */
export function displayTitle(title: string | null | undefined): string {
  return title?.trim() || texts.common.untitled
}
