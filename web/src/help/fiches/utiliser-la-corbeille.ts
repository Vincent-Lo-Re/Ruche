import type { HelpFiche } from "@/help/types"
import { sectionNamesFor } from "@/lib/section-names"

// Les noms du Blog et des Podcasts, ceux de l'admin s'il les a changés.
const names = sectionNamesFor("fr")

export const fiche: HelpFiche = {
  slug: "utiliser-la-corbeille",
  theme: "corbeille",
  title: "Restaurer ou effacer depuis la Corbeille",
  summary:
    "Tout ce qui est mis à la corbeille y reste 30 jours, le temps de le restaurer, puis il est effacé définitivement.",
  keywords: [
    "corbeille",
    "restaurer",
    "récupérer",
    "supprimer",
    "effacer",
    "vider",
    "30 jours",
  ],
  steps: [
    `Ouvre « Corbeille » dans le menu ; filtre par type si besoin (Médiathèque, Pages, ${names.blog.name}, ${names.podcasts.name}, Modèles de bloc).`,
    "Pour récupérer un élément, clique sur « Restaurer » sur sa ligne.",
    "Pour effacer un élément tout de suite, clique sur « Supprimer définitivement », puis confirme. Pour en effacer plusieurs, coche-les, puis clique sur « Supprimer définitivement (n) ».",
    "Pour tout effacer, clique sur « Vider la corbeille », puis confirme.",
  ],
  notes: [
    "Effacer ou vider est définitif : tu ne pourras pas revenir en arrière.",
    "Sans geste de ta part, chaque élément est effacé au bout de 30 jours : la colonne « Effacement automatique » donne la date.",
    "Un contenu restauré revient en brouillon : rien n'est republié dans l'app.",
  ],
}
