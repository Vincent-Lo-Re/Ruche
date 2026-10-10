import { texts } from "@/texts"

// L'adresse où l'on signale un bug ou demande une fonctionnalité de Ruche.
const FEEDBACK_EMAIL = "ruche.press@gmail.com"

/**
 * En bas à droite du contenu des pages avec le menu : la version de l'admin, et un lien pour
 * signaler un bug ou demander une fonctionnalité (un e-mail à Ruche).
 */
export function AppFooter() {
  return (
    <footer className="flex flex-wrap justify-end gap-x-4 gap-y-1 px-8 pb-footer text-xs text-muted-foreground">
      <span>{texts.footer.version(import.meta.env.VITE_APP_VERSION)}</span>
      <a
        href={`mailto:${FEEDBACK_EMAIL}`}
        className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {texts.footer.feedback}
      </a>
    </footer>
  )
}
