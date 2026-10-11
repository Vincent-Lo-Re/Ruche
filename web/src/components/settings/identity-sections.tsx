import { AdminIdentityCard } from "@/components/settings/admin-identity-card"
import { BrandLogosCard } from "@/components/settings/brand-logos-card"
import { LoginScreenCard } from "@/components/settings/login-screen-card"
import { SettingsSection } from "@/components/settings/settings-section"
import { identityWords, type IdentityTarget } from "@/lib/admin-identity"

/**
 * Les sections d'une identité, le titre à gauche et la carte à droite, empilées sur un écran
 * étroit (conteneur, maquette docs/maquettes/parametres-identite.html) : Marque, l'écran (de
 * connexion pour l'admin, de chargement pour l'app) et Logos. Paramètres › Identité de l'admin
 * (`target="admin"`) et App mobile › Identité (`target="app"`, ADMIN § 1).
 */
export function IdentitySections({ target }: { target: IdentityTarget }) {
  const words = identityWords(target)
  return (
    <div className="@container space-y-8 pt-4">
      <SettingsSection
        title={words.brand.title}
        description={words.brand.description}
      >
        <AdminIdentityCard target={target} />
      </SettingsSection>
      <SettingsSection
        title={words.screen.title}
        description={words.screen.description}
      >
        <LoginScreenCard target={target} />
      </SettingsSection>
      <SettingsSection
        title={words.logos.title}
        description={words.logos.description}
      >
        <BrandLogosCard target={target} />
      </SettingsSection>
    </div>
  )
}
