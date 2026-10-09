import type { ReactNode } from "react"

/**
 * Une section de réglages (Paramètres, Mon compte), comme les pages de réglages des exemples de shadcn : à
 * gauche son titre et sa phrase, à droite sa carte ; dans un cadre étroit (tablette, téléphone),
 * le titre passe au-dessus. Le cadre est un conteneur (@container) : la mise en page suit sa
 * largeur, pas celle de la fenêtre. Une phrase en plusieurs parties (un tableau) s'écrit en
 * paragraphes séparés.
 */
export function SettingsSection({
  title,
  badge,
  description,
  children,
}: {
  title: string
  // Une pastille à côté du titre (le rôle du membre, dans Mon compte).
  badge?: ReactNode
  description: string | readonly string[]
  children: ReactNode
}) {
  return (
    <section className="grid gap-4 @3xl:grid-cols-settings @3xl:gap-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">{title}</h2>
          {badge}
        </div>
        <div className="space-y-2">
          {(typeof description === "string" ? [description] : description).map(
            (paragraph) => (
              <p key={paragraph} className="text-sm text-muted-foreground">
                {paragraph}
              </p>
            )
          )}
        </div>
      </div>
      {children}
    </section>
  )
}
