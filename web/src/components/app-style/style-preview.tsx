import {
  CircleAlert,
  CircleCheck,
  CircleUser,
  House,
  MicAudioLines,
  MoreHorizontal,
  Rss,
  type LucideIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

import { ReadabilityBadge } from "@/components/app-style/style-fields"
import { PhoneDevice } from "@/components/phone-device"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useBrandName } from "@/hooks/use-brand-name"
import type { ReadabilityIssue } from "@/lib/app-style/problems"
import {
  styleModes,
  type AppStyle,
  type StyleMode,
} from "@/lib/app-style/style"
import { partVariables, styleVariables } from "@/lib/app-style/variables"
import { cn } from "cn"
import { texts } from "@/texts"

import "./style-preview.css"

const labels = texts.appStyle.preview

/** Les variables d'un élément de l'aperçu (valeurs de la charte du client). */
const vars = (values: Record<string, string>) => values as CSSProperties

const tabs: { key: keyof typeof labels.tabs; icon: LucideIcon }[] = [
  { key: "home", icon: House },
  { key: "blog", icon: Rss },
  { key: "podcasts", icon: MicAudioLines },
  { key: "profile", icon: CircleUser },
]

/**
 * L'aperçu de la charte : un téléphone avec un article imaginaire aux couleurs, polices et formes
 * du brouillon, en clair ou en sombre (seulement le mode que garde la charte, s'il n'y en a qu'un),
 * en texte normal ou grand. Dessous, ce qui se lit mal.
 */
export function StylePreview({
  appStyle: style,
  mode,
  onModeChange,
  largeText,
  onLargeTextChange,
  issues,
}: {
  appStyle: AppStyle
  mode: StyleMode
  onModeChange: (mode: StyleMode) => void
  largeText: boolean
  onLargeTextChange: (large: boolean) => void
  issues: readonly ReadabilityIssue[]
}) {
  const brand = useBrandName()
  const modes = styleModes(style)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label={labels.mode}
          value={[mode]}
          onValueChange={(value: string[]) => {
            const next = modes.find((m) => m === value[0])
            if (next) onModeChange(next)
          }}
        >
          {(["light", "dark"] as const).map((m) => (
            <ToggleGroupItem key={m} value={m} disabled={!modes.includes(m)}>
              {labels[m]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label={labels.text}
          value={[largeText ? "large" : "normal"]}
          onValueChange={(value: string[]) => {
            if (value[0]) onLargeTextChange(value[0] === "large")
          }}
        >
          <ToggleGroupItem value="normal">{labels.normalText}</ToggleGroupItem>
          <ToggleGroupItem value="large">{labels.largeText}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div
        className="blocks-phone-holder style-preview"
        data-device="ios"
        // eslint-disable-next-line no-restricted-syntax -- les valeurs de la charte du client, qui changent en direct
        style={vars(styleVariables(style, mode))}
        data-fields={style.fields}
      >
        <PhoneDevice
          device="ios"
          theme={mode}
          largeText={largeText}
          appBar={
            <div className="style-topbar">
              <span className="style-brand">{brand}</span>
              <MoreHorizontal aria-hidden />
            </div>
          }
          footer={
            <div className="style-tabbar" aria-hidden>
              {tabs.map(({ key, icon: Icon }, index) => (
                <span key={key} className={cn(index === 0 && "style-tab-on")}>
                  <Icon />
                  {labels.tabs[key]}
                </span>
              ))}
            </div>
          }
        >
          <SampleArticle appStyle={style} mode={mode} />
        </PhoneDevice>
      </div>
      <ReadabilitySummary issues={issues} />
    </div>
  )
}

/** L'article imaginaire, avec un exemple de chaque élément de la charte. */
function SampleArticle({
  appStyle: style,
  mode,
}: {
  appStyle: AppStyle
  mode: StyleMode
}) {
  const [category, ...badges] = style.badges
  const badge = (item: AppStyle["badges"][number], text = item.name) => (
    <span
      key={item.id}
      className="style-badge"
      // eslint-disable-next-line no-restricted-syntax -- les couleurs de la pastille, choisies par le client
      style={vars(
        partVariables(style, mode, {
          fill: item.fill,
          border: item.border,
          text: item.text,
        })
      )}
    >
      {text}
    </span>
  )
  return (
    <div className="style-page">
      <div className="style-cover" />
      <h1 className="style-title">{labels.title}</h1>
      <div className="style-meta">
        {labels.meta}
        {category && badge(category, labels.category)}
      </div>
      <p className="style-body">
        {labels.bodyStart} <span className="style-link">{labels.link}</span>{" "}
        {labels.bodyEnd}
      </p>
      {badges.length > 0 && (
        <div className="style-badges">{badges.map((item) => badge(item))}</div>
      )}
      <h2 className="style-heading">{labels.heading}</h2>
      <p className="style-body">{labels.body2}</p>
      <blockquote className="style-quote">{labels.quote}</blockquote>
      <div className="style-cover style-cover-small" />
      <p className="style-small style-caption">{labels.caption}</p>
      {style.tints.map((tint) => (
        <div
          key={tint.id}
          className="style-box"
          // eslint-disable-next-line no-restricted-syntax -- les couleurs de la teinte, choisies par le client
          style={vars(
            partVariables(style, mode, {
              fill: tint.fill,
              border: tint.border,
              title: tint.title,
              text: tint.text,
              link: tint.link,
            })
          )}
        >
          <strong className="style-box-title">{tint.name}</strong>
          <p>{labels.boxText}</p>
          <span className="style-box-link">{labels.boxLink}</span>
        </div>
      ))}
      <div className="style-card">
        <div className="style-card-image" />
        <div>
          <strong className="style-heading-font">{labels.card}</strong>
          <span className="style-small">{labels.cardMeta}</span>
        </div>
      </div>
      <p className="style-state style-small" data-state="success">
        <CircleCheck aria-hidden />
        {labels.saved}
      </p>
      <p className="style-state style-small" data-state="warning">
        <CircleAlert aria-hidden />
        {labels.offline}
      </p>
      <div className="style-field style-small">
        <span>{labels.firstName}</span>
        <div className="style-input style-placeholder">
          {labels.firstNamePlaceholder}
        </div>
      </div>
      <div className="style-field style-small">
        <span>{labels.search}</span>
        <div className="style-input" data-focus>
          {labels.searchValue}
        </div>
      </div>
      <div className="style-field style-small">
        <span>{labels.email}</span>
        <div className="style-input" data-error>
          {labels.emailValue}
        </div>
        <span className="style-error">{labels.emailError}</span>
      </div>
      {style.buttons.map((button) => (
        <span
          key={button.id}
          className="style-button"
          data-kind={button.kind}
          data-shape={button.shape}
          // eslint-disable-next-line no-restricted-syntax -- les couleurs du bouton, choisies par le client
          style={vars(
            partVariables(style, mode, {
              fill: button.fill,
              end: button.end,
              border: button.border,
              label: button.label,
            })
          )}
        >
          {button.name}
        </span>
      ))}
    </div>
  )
}

/** Sous l'aperçu : tout est lisible, ou la liste de ce qui ne l'est pas. */
function ReadabilitySummary({
  issues,
}: {
  issues: readonly ReadabilityIssue[]
}) {
  const words = texts.appStyle.readability
  return (
    <div className="w-full max-w-sm space-y-2 text-sm" role="status">
      {issues.length === 0 ? (
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <CircleCheck aria-hidden className="size-4" />
          {words.allGood}
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <ReadabilityBadge issues={issues} />
          <span className="text-muted-foreground">
            {words.count(issues.length)}
          </span>
        </div>
      )}
    </div>
  )
}
