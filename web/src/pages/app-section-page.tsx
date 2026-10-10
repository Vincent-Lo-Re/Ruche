import { ListEmpty } from "@/components/list-card"
import { PageHeader } from "@/components/page-header"
import { sections, type appSections } from "@/navigation"
import { texts } from "@/texts"

/**
 * Une page du groupe « App mobile » (ADMIN § 1, admins seulement) : Identité, Charte graphique,
 * Formes et fichier, Navigation, Mises en page. Chacune est une vraie page, son titre et son
 * icône ; elles se rempliront avec l'app mobile.
 */
export function AppSectionPage({
  section,
}: {
  section: (typeof appSections)[number]
}) {
  const { icon } = sections[section]
  const { title, description } = texts.sections[section]
  return (
    <>
      <PageHeader icon={icon} title={title} description={description} />
      <ListEmpty
        icon={icon}
        title={texts.appPages.soon.title}
        description={texts.appPages.soon.description}
      />
    </>
  )
}
