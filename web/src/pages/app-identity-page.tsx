import { PageHeader } from "@/components/page-header"
import { IdentitySections } from "@/components/settings/identity-sections"
import { sections } from "@/navigation"
import { texts } from "@/texts"

/**
 * App mobile › Identité (ADMIN § 1, admins seulement) : les sections de Paramètres › Identité de
 * l'admin, reprises pour l'app (table app_identity) : Marque, Écran de chargement, Logos. Sans
 * brouillon : l'app lit ce qui est enregistré à sa prochaine ouverture.
 */
export function AppIdentityPage() {
  const { title, description } = texts.sections.appIdentity
  return (
    <>
      <PageHeader
        icon={sections.appIdentity.icon}
        title={title}
        description={description}
      />
      <IdentitySections target="app" />
    </>
  )
}
