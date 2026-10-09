import type { HelpFiche } from "@/help/types"
import { capitalized, frenchTerm, le } from "@/texts/grammar/fr"

const blog = frenchTerm("blog")
const podcasts = frenchTerm("podcasts")

export const fiche: HelpFiche = {
  slug: "gerer-les-categories",
  theme: "contenus",
  title: "Gérer les catégories",
  summary: `${capitalized(le(blog))} et ${le(podcasts)} ont chacun leurs catégories, que l'app utilise pour filtrer les contenus.`,
  keywords: [
    "catégorie",
    "filtre",
    "thème",
    "classer",
    "renommer",
    "ordre",
    "étiquette",
  ],
  steps: [
    `Ouvre « ${blog.name} » ou « ${podcasts.name} », puis clique sur « Catégories ».`,
    "Pour en ajouter une, clique sur « Nouvelle catégorie » en haut de la page, écris son nom, puis clique sur « Enregistrer ».",
    "Range-les avec la poignée, à la souris ou au clavier : l'app les montre dans cet ordre.",
    "Pour renommer ou supprimer une catégorie, ouvre le menu « … » de sa ligne et choisis « Modifier » ou « Supprimer définitivement ». Pour en supprimer plusieurs, coche-les, puis clique sur « Supprimer définitivement (n) ».",
    "La pastille « État » d'une catégorie ouvre la liste des contenus qui l'utilisent : tu peux l'exporter, ou retirer la catégorie de certains contenus.",
    "Pour donner des catégories à un contenu, choisis-les dans la colonne de droite de l'éditeur ; « Ajouter » en crée une sur place.",
  ],
  notes: [
    "Les catégories sont facultatives : un contenu peut en avoir une, plusieurs ou aucune.",
    "Les catégories d'un contenu ne changent dans l'app qu'à sa prochaine publication.",
    "Supprimer une catégorie est définitif : elle ne passe pas par la corbeille, et elle disparaît tout de suite des filtres de l'app.",
  ],
}
