import { texts } from "@/texts"

/** Le titre affiché d'un contenu, d'un modèle ou d'un élément : « Sans titre » s'il est vide. */
export function displayTitle(title: string | null | undefined): string {
  return title?.trim() || texts.common.untitled
}
