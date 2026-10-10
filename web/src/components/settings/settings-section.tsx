import type { ReactNode } from "react"

/**
 * Une section de réglages (Paramètres, Mon compte), comme les pages de réglages des exemples de shadcn : à
 * gauche son titre et sa phrase, à droite sa carte ; dans un cadre étroit (tablette, téléphone),
 * le titre passe au-dessus. Le cadre est un conteneur (@container) : la mise en page suit sa
 * largeur, pas celle de la fenêtre. Une phrase en plusieurs parties (un tableau) s'écrit en
 * paragraphes séparés ; extra s'ajoute dessous (un conseil avec son titre). Avec id, la section
 * est une ancre qui peut recevoir le focus.
 */
export function SettingsSection({
  id,
  title,
  description,
  extra,
  children,
}: {
  // Une ancre (la colonne des sections de la charte de l'app y mène, le focus aussi).
  id?: string
  title: string
  description: string | readonly string[]
  extra?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      id={id}
      tabIndex={id ? -1 : undefined}
      className="grid gap-4 rounded-xl outline-none @3xl:grid-cols-settings @3xl:gap-8"
    >
      <div className="space-y-1">
        <h2 className="font-medium">{title}</h2>
        <div className="space-y-2">
          {(typeof description === "string" ? [description] : description).map(
            (paragraph) => (
              <p key={paragraph} className="text-sm text-muted-foreground">
                {paragraph}
              </p>
            )
          )}
          {extra}
        </div>
      </div>
      {children}
    </section>
  )
}
