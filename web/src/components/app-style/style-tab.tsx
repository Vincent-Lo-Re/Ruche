import { useQuery } from "@tanstack/react-query"
import {
  CircleAlert,
  CircleCheck,
  CloudCheck,
  CloudOff,
  LoaderCircle,
  Send,
  Undo2,
} from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"

import { ColorRolesCard, PaletteCard } from "@/components/app-style/color-cards"
import {
  FontRolesCard,
  FontsCard,
  SizesCard,
} from "@/components/app-style/font-cards"
import {
  BadgesCard,
  ButtonsCard,
  TintsCard,
} from "@/components/app-style/item-cards"
import {
  DarkModeCard,
  FieldsCard,
  FileCard,
  ShapesCard,
} from "@/components/app-style/look-cards"
import { StylePreview } from "@/components/app-style/style-preview"
import {
  useStyleDraft,
  type DraftStatus,
} from "@/components/app-style/use-style-draft"
import { LoadState } from "@/components/load-state"
import { SettingsSection } from "@/components/settings/settings-section"
import { TrashDialog } from "@/components/trash-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { AppStyleRow } from "@/lib/app-style/api"
import { fontFaces } from "@/lib/app-style/fonts"
import { readabilityIssues } from "@/lib/app-style/problems"
import {
  groupOf,
  groupsWithIssues,
  sectionAnchor,
  styleSectionGroups,
  type StyleSection,
  type StyleSectionGroup,
} from "@/lib/app-style/sections"
import { styleModes, type StyleMode } from "@/lib/app-style/style"
import { formatDateTime } from "@/lib/dates"
import { appStyleRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.appStyle

// La durée du fond qui s'allume sur la section atteinte (data-returned d'index.css).
const HIGHLIGHT_MS = 1600

/** Les familles où un texte se lit mal, pour la colonne de gauche. */
export type StyleFlags = ReadonlySet<StyleSectionGroup>

type Props = {
  // La famille de réglages ouverte, choisie à gauche ou par un élément du téléphone.
  group: StyleSectionGroup
  onGroup: (group: StyleSectionGroup) => void
  // La colonne de gauche de la page, avec les familles signalées et ce qui s'ajoute dessous.
  aside: (flags?: StyleFlags, extra?: ReactNode) => ReactNode
}

/**
 * Onglet « Charte graphique » de la section « App » (ADMIN § 1) : au centre, l'aperçu du
 * téléphone ; à droite, les réglages de la famille ouverte et, en bas, l'état du brouillon et de
 * la publication, « Revenir » et « Publier ».
 */
export function StyleTab(props: Props) {
  const row = useQuery(appStyleRead())
  if (!row.isSuccess)
    return (
      <>
        {props.aside()}
        <Card className="lg:col-span-2">
          <CardContent>
            <LoadState query={row} rows={4} failed={labels.loadFailed} />
          </CardContent>
        </Card>
      </>
    )
  return <StyleEditor row={row.data} {...props} />
}

function StyleEditor({
  row,
  group,
  onGroup,
  aside,
}: Props & { row: AppStyleRow }) {
  const draft = useStyleDraft(row)
  const { style, change } = draft
  const [chosenMode, setMode] = useState<StyleMode>("light")
  const [largeText, setLargeText] = useState(false)
  // Le mode de l'aperçu : celui que garde la charte, si elle n'en garde qu'un.
  const modes = styleModes(style)
  const mode = modes.includes(chosenMode) ? chosenMode : modes[0]
  const issues = useMemo(() => readabilityIssues(style), [style])
  const flagged = useMemo(() => groupsWithIssues(issues), [issues])
  const [discarding, setDiscarding] = useState(false)
  const faces = useMemo(() => fontFaces(style.fonts), [style.fonts])
  const cardProps = { appStyle: style, change }
  const colorProps = { ...cardProps, mode, issues }

  const cards: Record<StyleSection, ReactNode> = {
    darkMode: <DarkModeCard {...cardProps} />,
    colors: <PaletteCard {...cardProps} />,
    roles: <ColorRolesCard {...colorProps} />,
    tints: <TintsCard {...colorProps} />,
    badges: <BadgesCard {...colorProps} />,
    buttons: <ButtonsCard {...colorProps} />,
    fields: <FieldsCard {...cardProps} />,
    fonts: <FontsCard {...cardProps} />,
    fontRoles: <FontRolesCard {...cardProps} />,
    sizes: <SizesCard {...cardProps} />,
    shapes: <ShapesCard {...cardProps} />,
    file: <FileCard {...cardProps} />,
  }
  const shown = styleSectionGroups.find((family) => family.group === group)!

  // Un élément du téléphone : sa famille s'ouvre, la colonne défile jusqu'à son réglage (sans
  // animation si l'ordinateur en demande moins), le focus y va, et son fond s'allume un instant.
  const pick = (section: StyleSection) => {
    flushSync(() => onGroup(groupOf(section)))
    const element = document.getElementById(sectionAnchor(section))
    if (!element) return
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    // jsdom (les tests) ne fait pas défiler.
    element.scrollIntoView?.({
      block: "start",
      behavior: reduced ? "auto" : "smooth",
    })
    element.focus({ preventScroll: true })
    element.setAttribute("data-returned", "")
    window.setTimeout(
      () => element.removeAttribute("data-returned"),
      HIGHLIGHT_MS
    )
  }

  return (
    <>
      {/* Les polices de la charte, servies par l'admin (public/fonts/). */}
      {faces && <style>{faces}</style>}
      {aside(
        flagged,
        <div className="space-y-2 px-2 text-xs">
          <Readability count={issues.length} />
          <p className="text-muted-foreground">{labels.sections.hint}</p>
        </div>
      )}
      <StylePreview
        appStyle={style}
        mode={mode}
        onModeChange={setMode}
        largeText={largeText}
        onLargeTextChange={setLargeText}
        onPick={pick}
      />
      <div className="flex min-h-0 min-w-0 flex-col">
        {/* Une famille à la fois ; changer de famille repart du haut (une colonne neuve). */}
        <div
          key={group}
          className="@container min-h-0 flex-1 space-y-8 pb-6 lg:overflow-y-auto"
        >
          {draft.status === "blocked" && (
            <Alert>
              <AlertDescription>{labels.blocked}</AlertDescription>
            </Alert>
          )}
          {shown.sections.map((key) => (
            <SettingsSection
              key={key}
              id={sectionAnchor(key)}
              title={labels[key].title}
              description={labels[key].description}
            >
              {cards[key]}
            </SettingsSection>
          ))}
        </div>
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <PublishState row={row} modified={draft.modified} />
            <DraftState status={draft.status} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={!draft.modified || draft.discard.isPending}
              onClick={() => setDiscarding(true)}
            >
              <Undo2 aria-hidden />
              {labels.discard}
            </Button>
            <Button
              disabled={
                !draft.modified ||
                draft.status === "blocked" ||
                draft.publish.isPending
              }
              onClick={() => draft.publish.mutate()}
            >
              {draft.publish.isPending ? <Spinner /> : <Send aria-hidden />}
              {labels.publish}
            </Button>
          </div>
        </div>
      </div>
      <TrashDialog
        open={discarding}
        title={labels.discardTitle}
        description={labels.discardDescription}
        confirmLabel={labels.discardConfirm}
        pending={draft.discard.isPending}
        onCancel={() => setDiscarding(false)}
        onConfirm={() =>
          draft.discard.mutate(undefined, {
            onSettled: () => setDiscarding(false),
          })
        }
      />
    </>
  )
}

/** Le nombre de textes qui se lisent mal, dans les modes que garde la charte. */
function Readability({ count }: { count: number }) {
  return (
    <p role="status" className="flex items-center gap-1.5">
      {count === 0 ? (
        <>
          <CircleCheck aria-hidden className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {labels.readability.allGood}
          </span>
        </>
      ) : (
        <>
          <CircleAlert aria-hidden className="size-3.5 text-warning" />
          <span className="text-warning">
            {labels.readability.count(count)}
          </span>
        </>
      )}
    </p>
  )
}

/** Ce que voient les lecteurs : jamais publiée, publiée (et quand), modifiée depuis. */
function PublishState({
  row,
  modified,
}: {
  row: AppStyleRow
  modified: boolean
}) {
  const words = labels.status
  if (!row.publishedAt) return <Badge variant="outline">{words.never}</Badge>
  return (
    <>
      <Badge variant="secondary">
        {words.published(formatDateTime(row.publishedAt))}
      </Badge>
      {modified && <Badge variant="outline">{words.modified}</Badge>}
    </>
  )
}

/** L'enregistrement du brouillon, en icône et en mots. */
function DraftState({ status }: { status: DraftStatus }) {
  const words = labels.status
  if (status === "blocked") return null
  const { icon: Icon, text } = {
    saved: { icon: CloudCheck, text: words.saved },
    saving: { icon: LoaderCircle, text: words.saving },
    failed: { icon: CloudOff, text: words.failed },
  }[status]
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Icon
        aria-hidden
        className={
          status === "saving" ? "size-4 motion-safe:animate-spin" : "size-4"
        }
      />
      {text}
    </span>
  )
}
