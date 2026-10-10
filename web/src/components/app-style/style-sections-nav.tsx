import { CircleAlert, CircleCheck } from "lucide-react"

import { ListSelect } from "@/components/list-select"
import {
  sectionAnchor,
  styleSectionGroups,
  styleSections,
  type StyleSection,
} from "@/lib/app-style/sections"
import { cn } from "cn"
import { texts } from "@/texts"

const labels = texts.appStyle

/** Le titre d'une section de la charte. */
const sectionTitle = (section: StyleSection) => labels[section].title

/**
 * La colonne des sections, à gauche de l'onglet « Charte graphique » : un lien par section, rangés
 * par groupe ; la section lue est marquée, et un point signale celles où un texte se lit mal.
 */
export function SectionLinks({
  current,
  flagged,
  hardToRead,
  onGo,
}: {
  current: StyleSection
  flagged: ReadonlySet<StyleSection>
  // Le nombre de textes qui se lisent mal, dans les modes que garde la charte.
  hardToRead: number
  onGo: (section: StyleSection) => void
}) {
  return (
    <nav aria-label={labels.sections.label} className="space-y-4">
      {styleSectionGroups.map(({ group, sections }) => (
        <div key={group} className="space-y-1">
          <p className="px-2 text-xs font-medium text-muted-foreground">
            {labels.sections.groups[group]}
          </p>
          <ul>
            {sections.map((section) => (
              <li key={section}>
                <a
                  href={`#${sectionAnchor(section)}`}
                  aria-current={section === current ? "location" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                    section === current && "bg-muted font-medium"
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    onGo(section)
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {sectionTitle(section)}
                  </span>
                  {flagged.has(section) && (
                    <span className="size-2 shrink-0 rounded-full bg-warning">
                      <span className="sr-only">
                        {labels.sections.hardToRead}
                      </span>
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p role="status" className="flex items-center gap-1.5 px-2 text-xs">
        {hardToRead === 0 ? (
          <>
            <CircleCheck
              aria-hidden
              className="size-3.5 text-muted-foreground"
            />
            <span className="text-muted-foreground">
              {labels.readability.allGood}
            </span>
          </>
        ) : (
          <>
            <CircleAlert aria-hidden className="size-3.5 text-warning" />
            <span className="text-warning">
              {labels.readability.count(hardToRead)}
            </span>
          </>
        )}
      </p>
      <p className="px-2 text-xs text-muted-foreground">
        {labels.sections.hint}
      </p>
    </nav>
  )
}

/** Sur un écran plus étroit, la même chose en liste de choix, en haut des réglages. */
export function SectionSelect({
  current,
  onGo,
}: {
  current: StyleSection
  onGo: (section: StyleSection) => void
}) {
  return (
    <ListSelect
      id="style-section"
      label={labels.sections.jumpTo}
      items={styleSections.map(({ key }) => ({
        value: key,
        label: sectionTitle(key),
      }))}
      value={current}
      onValueChange={(value) => {
        const section = styleSections.find(({ key }) => key === value)
        if (section) onGo(section.key)
      }}
    />
  )
}
