import {
  CreditCard,
  PanelsTopLeft,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { AccessLevelsCard } from "@/components/settings/access-levels-card"
import { AdminFormatCard } from "@/components/settings/admin-format-card"
import { AdminLanguageCard } from "@/components/settings/admin-language-card"
import { AdminTimeZoneCard } from "@/components/settings/admin-time-zone-card"
import { IdentitySections } from "@/components/settings/identity-sections"
import { SectionNamesCard } from "@/components/settings/section-names-card"
import { SettingsSection } from "@/components/settings/settings-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAddressState } from "@/hooks/use-address-state"
import {
  settingsTabFromAddress,
  settingsTabs,
  writeSettingsTab,
  type SettingsTab,
} from "@/lib/address"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.settings

const tabIcons: Record<SettingsTab, LucideIcon> = {
  admin: PanelsTopLeft,
  plans: CreditCard,
  advanced: Wrench,
}

/**
 * Paramètres (admins seulement, ADMIN § 7) : trois onglets, l'identité de l'admin, les formules
 * d'abonnement et les réglages avancés (ce que voient les lecteurs de l'app est dans la section
 * « App »). L'onglet ouvert est dans l'adresse
 * (« ?tab=plans »). Sont remplis : le nom de la marque, le logotype et le monogramme (Identité de l'admin), les
 * formules et la langue de l'admin (Avancé).
 */
export function SettingsPage() {
  const { title, description } = texts.sections.settings
  const [tab, setTab] = useAddressState(
    settingsTabFromAddress,
    writeSettingsTab
  )
  return (
    <>
      <PageHeader
        icon={sections.settings.icon}
        title={title}
        description={description}
      />
      <Tabs value={tab} onValueChange={(value: SettingsTab) => setTab(value)}>
        {/* Les onglets restent en haut quand la page défile, sur le fond du panneau (qui couvre sa
            marge de chaque côté). */}
        <div className="sticky top-0 z-10 -mx-8 -my-3 self-stretch bg-panel-solid px-8 py-3">
          <TabsList aria-label={labels.tabs.label}>
            {settingsTabs.map((value) => {
              const Icon = tabIcons[value]
              return (
                <TabsTrigger key={value} value={value}>
                  <Icon />
                  {labels.tabs[value]}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
        {settingsTabs.map((value) => (
          <TabsContent key={value} value={value} data-settings-tab={value}>
            {value === "admin" ? (
              <IdentitySections target="admin" />
            ) : value === "plans" ? (
              <AccessLevelsCard />
            ) : (
              <div className="@container space-y-8 pt-4">
                <SettingsSection
                  title={labels.advanced.language.title}
                  description={labels.advanced.language.description}
                >
                  <AdminLanguageCard />
                </SettingsSection>
                <SettingsSection
                  title={labels.advanced.format.title}
                  description={labels.advanced.format.description}
                >
                  <AdminFormatCard />
                </SettingsSection>
                <SettingsSection
                  title={labels.advanced.timeZone.title}
                  description={labels.advanced.timeZone.description}
                >
                  <AdminTimeZoneCard />
                </SettingsSection>
                <SettingsSection
                  title={labels.advanced.sectionNames.title}
                  description={labels.advanced.sectionNames.description}
                >
                  <SectionNamesCard />
                </SettingsSection>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
