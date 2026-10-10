import { useQuery } from "@tanstack/react-query"
import { CloudCheck, CloudOff, LoaderCircle, Send, Undo2 } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

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
import { styleModes, type StyleMode } from "@/lib/app-style/style"
import { formatDateTime } from "@/lib/dates"
import { appStyleRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.appStyle

/**
 * Onglet « Charte graphique » de la section « App » (ADMIN § 1) : à gauche, les réglages de la
 * charte en sections ; à droite, l'aperçu du téléphone. En haut, l'état du brouillon et de la
 * publication, « Publier » et « Annuler les modifications ».
 */
export function StyleTab() {
  const row = useQuery(appStyleRead())
  if (!row.isSuccess)
    return (
      <Card className="mt-4">
        <CardContent>
          <LoadState query={row} rows={4} failed={labels.loadFailed} />
        </CardContent>
      </Card>
    )
  return <StyleEditor row={row.data} />
}

function StyleEditor({ row }: { row: AppStyleRow }) {
  const draft = useStyleDraft(row)
  const { style, change } = draft
  const [chosenMode, setMode] = useState<StyleMode>("light")
  const [largeText, setLargeText] = useState(false)
  // Le mode de l'aperçu : celui que garde la charte, si elle n'en garde qu'un.
  const modes = styleModes(style)
  const mode = modes.includes(chosenMode) ? chosenMode : modes[0]
  const issues = useMemo(() => readabilityIssues(style), [style])
  const [discarding, setDiscarding] = useState(false)
  const faces = useMemo(() => fontFaces(style.fonts), [style.fonts])

  const section = (
    key:
      | "darkMode"
      | "colors"
      | "roles"
      | "tints"
      | "badges"
      | "buttons"
      | "fields"
      | "fonts"
      | "fontRoles"
      | "sizes"
      | "shapes"
      | "file",
    card: ReactNode
  ) => (
    <SettingsSection
      title={labels[key].title}
      description={labels[key].description}
    >
      {card}
    </SettingsSection>
  )

  return (
    <div className="space-y-6 pt-4">
      {/* Les polices de la charte, servies par l'admin (public/fonts/). */}
      {faces && <style>{faces}</style>}
      <div className="flex flex-wrap items-center gap-2">
        <PublishState row={row} modified={draft.modified} />
        <DraftState status={draft.status} />
        <span className="flex-1" />
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
      {draft.status === "blocked" && (
        <Alert>
          <AlertDescription>{labels.blocked}</AlertDescription>
        </Alert>
      )}
      <div className="grid items-start gap-8 xl:grid-cols-style-editor">
        <div className="@container min-w-0 space-y-8">
          {section(
            "darkMode",
            <DarkModeCard appStyle={style} change={change} />
          )}
          {section("colors", <PaletteCard appStyle={style} change={change} />)}
          {section(
            "roles",
            <ColorRolesCard
              appStyle={style}
              mode={mode}
              issues={issues}
              change={change}
            />
          )}
          {section(
            "tints",
            <TintsCard
              appStyle={style}
              mode={mode}
              issues={issues}
              change={change}
            />
          )}
          {section(
            "badges",
            <BadgesCard
              appStyle={style}
              mode={mode}
              issues={issues}
              change={change}
            />
          )}
          {section(
            "buttons",
            <ButtonsCard
              appStyle={style}
              mode={mode}
              issues={issues}
              change={change}
            />
          )}
          {section("fields", <FieldsCard appStyle={style} change={change} />)}
          {section("fonts", <FontsCard appStyle={style} change={change} />)}
          {section(
            "fontRoles",
            <FontRolesCard appStyle={style} change={change} />
          )}
          {section("sizes", <SizesCard appStyle={style} change={change} />)}
          {section("shapes", <ShapesCard appStyle={style} change={change} />)}
          {section("file", <FileCard appStyle={style} change={change} />)}
        </div>
        <div className="xl:sticky xl:top-16">
          <StylePreview
            appStyle={style}
            mode={mode}
            onModeChange={setMode}
            largeText={largeText}
            onLargeTextChange={setLargeText}
            issues={issues}
          />
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
    </div>
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
