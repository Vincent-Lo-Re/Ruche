import type { ReactNode } from "react"

import { appTabIcons } from "@/components/app-tab-icons"
import { appTabs, type AppTab } from "@/lib/address"
import {
  styleSectionGroups,
  type StyleSectionGroup,
} from "@/lib/app-style/sections"
import { cn } from "cn"
import { texts } from "@/texts"

const labels = texts.appPage
const groupLabels = texts.appStyle.sections

// Une ligne de la colonne : l'onglet ou la famille ouverte se détache en blanc sur le panneau.
const itemClass = (current: boolean) =>
  cn(
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-background/60 focus-visible:ring-3 focus-visible:ring-ring/50",
    current && "bg-background font-medium shadow-xs hover:bg-background"
  )

/**
 * Les onglets de la section « App », en colonne à gauche de la page. Sous « Charte graphique »,
 * ses familles de réglages (Couleurs, Éléments, Texte, Formes et fichier) : chacune ouvre les
 * siennes dans la colonne de droite ; un point signale celles où un texte se lit mal.
 */
export function AppNav({
  tab,
  group,
  onTab,
  onGroup,
  flagged,
}: {
  tab: AppTab
  group: StyleSectionGroup
  onTab: (tab: AppTab) => void
  onGroup: (group: StyleSectionGroup) => void
  flagged?: ReadonlySet<StyleSectionGroup>
}) {
  return (
    <nav aria-label={labels.tabs.label}>
      <ul className="space-y-1">
        {appTabs.map((value) => {
          const Icon = appTabIcons[value]
          return (
            <li key={value}>
              <button
                type="button"
                aria-current={tab === value ? "page" : undefined}
                className={itemClass(tab === value && value !== "style")}
                onClick={() => onTab(value)}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {labels.tabs[value]}
              </button>
              {value === "style" && (
                <ul
                  aria-label={groupLabels.label}
                  className="mt-1 ml-4 space-y-1 border-l pl-2"
                >
                  {styleSectionGroups.map(({ group: family }) => {
                    const current = tab === "style" && group === family
                    return (
                      <li key={family}>
                        <button
                          type="button"
                          aria-current={current ? "true" : undefined}
                          className={itemClass(current)}
                          onClick={() => onGroup(family)}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {groupLabels.groups[family]}
                          </span>
                          {flagged?.has(family) && <Dot />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Dot(): ReactNode {
  return (
    <span className="size-2 shrink-0 rounded-full bg-warning">
      <span className="sr-only">{groupLabels.hardToRead}</span>
    </span>
  )
}
