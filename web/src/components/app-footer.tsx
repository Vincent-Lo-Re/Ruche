import { texts } from "@/texts"

// En bas à droite du contenu des pages avec le menu : la version de l'admin.
export function AppFooter() {
  return (
    <footer className="flex justify-end px-8 pb-footer text-xs text-muted-foreground">
      <span>{texts.footer.version(import.meta.env.VITE_APP_VERSION)}</span>
    </footer>
  )
}
