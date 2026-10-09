// Les noms d'origine du Blog et des Podcasts, dans chaque langue (l'anglais d'abord). Un admin peut
// les remplacer (Paramètres › Avancé, lib/section-names.ts). En français, trois formes : le nom
// (menu, titres, listes), avec « le » et avec « du » ; en anglais, le nom seul suffit.

export const defaultSectionNames = {
  en: {
    blog: { name: "Blog", le: "the Blog", du: "the Blog" },
    podcasts: { name: "Podcasts", le: "the Podcasts", du: "the Podcasts" },
  },
  fr: {
    blog: { name: "Blog", le: "le Blog", du: "du Blog" },
    podcasts: { name: "Podcasts", le: "les Podcasts", du: "des Podcasts" },
  },
} as const
