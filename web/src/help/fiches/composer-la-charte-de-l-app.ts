import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "composer-la-charte-de-l-app",
  theme: "equipe",
  title: "Composer la charte graphique de l'app",
  summary:
    "Un admin choisit les couleurs, les polices et les formes de l'app, les essaie dans l'aperçu, puis les publie pour les lecteurs.",
  keywords: [
    "charte",
    "graphique",
    "app",
    "couleurs",
    "palette",
    "polices",
    "typographie",
    "boutons",
    "encadrés",
    "teintes",
    "pastilles",
    "mode sombre",
    "contraste",
    "lisibilité",
    "thème",
    "exporter",
    "importer",
  ],
  steps: [
    "Ouvre « App » dans le menu, onglet « Charte graphique ».",
    "Dans « Couleurs », nomme tes couleurs et donne à chacune sa valeur en clair et en sombre (clique sur un code pour ouvrir le nuancier, ou colle un code comme #9b3b5e).",
    "Dans « Où va chaque couleur », choisis la couleur de chaque usage : fond, texte, liens, barres, états. Fais de même pour les teintes des encadrés, les pastilles, les boutons et les polices.",
    "Regarde l'aperçu à droite, en clair, en sombre et en grand texte : il suit chaque changement.",
    "Clique sur « Publier » : l'app se sert de la charte publiée.",
  ],
  notes: [
    "Ta charte est un brouillon : chaque changement s'enregistre tout seul, et les lecteurs ne voient rien avant « Publier ».",
    "« Revenir à la version publiée » efface les changements du brouillon (jamais publiée : la charte neutre de Ruche).",
    "« Peu lisible » signale un texte qui manque de contraste (4,5:1 pour un texte, 3:1 pour la bordure d'un champ actif). Rien n'est refusé : c'est un conseil.",
    "Une couleur ou une police qui sert quelque part ne se supprime pas : choisis-en d'abord une autre là où elle sert. Il faut trois polices au moins.",
    "Deux couleurs (ou deux teintes, pastilles, boutons, polices) ne portent pas le même nom, majuscules et espaces ignorés.",
    "Les polices de Google Fonts sont copiées dans ton stockage à la publication : ni l'admin ni l'app n'appellent Google.",
    "« Exporter » enregistre la charte dans un fichier ; « Importer » remplace le brouillon par celle d'un fichier.",
  ],
}
