import type { ReactNode } from "react"

import { AppNav } from "@/components/app-nav"
import { appTabIcons } from "@/components/app-tab-icons"
import { StyleTab, type StyleFlags } from "@/components/app-style/style-tab"
import { ListEmpty } from "@/components/list-card"
import { PageHeader } from "@/components/page-header"
import { useAddressState } from "@/hooks/use-address-state"
import {
  appTabFromAddress,
  styleGroupFromAddress,
  writeAppTab,
  writeStyleGroup,
} from "@/lib/address"
import type { StyleSectionGroup } from "@/lib/app-style/sections"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.appPage

/**
 * La section « App » (admins seulement, ADMIN § 1) : tout ce que voient les lecteurs de l'app, en
 * trois colonnes qui tiennent dans le panneau (la plus large au centre, pour le téléphone). À gauche, le titre et les quatre
 * onglets (sous la charte graphique, ses familles de réglages) ; au centre, le téléphone ; à
 * droite, les réglages. Seule la charte graphique est construite ; l'identité, la navigation et
 * les mises en page arrivent avec l'app mobile. L'onglet et la famille ouverts sont dans
 * l'adresse (« ?group=text »).
 */
export function AppPage() {
  const { title, description } = texts.sections.app
  const [tab, setTab] = useAddressState(appTabFromAddress, writeAppTab)
  const [group, setGroup] = useAddressState(
    styleGroupFromAddress,
    writeStyleGroup
  )
  const openGroup = (next: StyleSectionGroup) => {
    setTab("style")
    setGroup(next)
  }
  const aside = (flags?: StyleFlags, extra?: ReactNode) => (
    <div className="flex min-h-0 flex-col gap-6 lg:overflow-y-auto">
      <PageHeader
        icon={sections.app.icon}
        title={title}
        description={description}
      />
      <AppNav
        tab={tab}
        group={group}
        onTab={setTab}
        onGroup={openGroup}
        flagged={flags}
      />
      {extra}
    </div>
  )
  return (
    // Sur un écran large, la page tient dans le panneau (posée sur lui, avec ses marges) : seules
    // les colonnes défilent. Plus étroit, les colonnes s'empilent et la page défile.
    <div className="grid gap-6 lg:absolute lg:inset-0 lg:grid-cols-app-page lg:grid-rows-1 lg:p-8 lg:pb-page">
      {tab === "style" ? (
        <StyleTab group={group} onGroup={openGroup} aside={aside} />
      ) : (
        <>
          {aside()}
          <div className="lg:col-span-2">
            <ListEmpty
              icon={appTabIcons[tab]}
              title={labels.soon.title}
              description={labels.soon.description}
            />
          </div>
        </>
      )}
    </div>
  )
}
