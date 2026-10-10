import {
  Compass,
  Fingerprint,
  LayoutTemplate,
  Palette,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import { StyleTab } from "@/components/app-style/style-tab"
import { AppTabActionsContext } from "@/components/app-tab-actions"
import { ListEmpty } from "@/components/list-card"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAddressState } from "@/hooks/use-address-state"
import {
  appTabFromAddress,
  appTabs,
  writeAppTab,
  type AppTab,
} from "@/lib/address"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.appPage

const tabIcons: Record<AppTab, LucideIcon> = {
  identity: Fingerprint,
  style: Palette,
  navigation: Compass,
  layouts: LayoutTemplate,
}

/**
 * La section « App » (admins seulement, ADMIN § 1) : tout ce que voient les lecteurs de l'app, en
 * quatre onglets. Seule la charte graphique est construite ; l'identité, la navigation et les
 * mises en page arrivent avec l'app mobile. L'onglet ouvert est dans l'adresse (« ?tab=style »).
 */
export function AppPage() {
  const { title, description } = texts.sections.app
  const [tab, setTab] = useAddressState(appTabFromAddress, writeAppTab)
  // La ligne des onglets et la place de leurs actions, pour l'onglet ouvert.
  const [bar, setBar] = useState<HTMLElement | null>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const actions = useMemo(() => ({ bar, slot }), [bar, slot])
  return (
    <>
      <PageHeader
        icon={sections.app.icon}
        title={title}
        description={description}
      />
      <Tabs value={tab} onValueChange={(value: AppTab) => setTab(value)}>
        {/* Les onglets restent en haut quand la page défile, sur le fond du panneau, avec à
            droite les actions de l'onglet ouvert. */}
        <div
          ref={setBar}
          className="sticky top-0 z-10 -mx-8 -my-3 flex flex-wrap items-center gap-x-4 gap-y-2 self-stretch bg-panel-solid px-8 py-3"
        >
          <TabsList aria-label={labels.tabs.label}>
            {appTabs.map((value) => {
              const Icon = tabIcons[value]
              return (
                <TabsTrigger key={value} value={value}>
                  <Icon />
                  {labels.tabs[value]}
                </TabsTrigger>
              )
            })}
          </TabsList>
          <div
            ref={setSlot}
            className="ml-auto flex flex-wrap items-center gap-2"
          />
        </div>
        {appTabs.map((value) => (
          <TabsContent key={value} value={value} data-app-tab={value}>
            {value === "style" ? (
              <AppTabActionsContext value={actions}>
                <StyleTab />
              </AppTabActionsContext>
            ) : (
              <ListEmpty
                icon={tabIcons[value]}
                title={labels.soon.title}
                description={labels.soon.description}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
