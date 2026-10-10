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
import { useEffect, useRef, useState, type CSSProperties } from "react"

import {
  DeviceTool,
  LargeTextTool,
  PreviewToolbar,
  ThemeTool,
} from "@/components/editor/preview-tools"
import { PhoneDevice } from "@/components/phone-device"
import { Separator } from "@/components/ui/separator"
import { useBrandName } from "@/hooks/use-brand-name"
import type { StyleSection } from "@/lib/app-style/sections"
import {
  styleModes,
  type AppStyle,
  type StyleMode,
} from "@/lib/app-style/style"
import { partVariables, styleVariables } from "@/lib/app-style/variables"
import {
  deviceHeightOf,
  phoneScale,
  type PreviewSettings,
} from "@/lib/editor/preview"
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

// L'air au-dessus et au-dessous du téléphone (py-6), dans la hauteur collée en haut.
const STAGE_PADDING = 24

/** La réduction du téléphone pour tenir dans la hauteur donnée, comme dans l'éditeur. */
function usePhoneScale(device: PreviewSettings["device"], height: number) {
  const holder = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    if (holder.current && height > 0)
      setScale(
        phoneScale(deviceHeightOf(holder.current), height - STAGE_PADDING * 2)
      )
  }, [device, height])
  return { holder, scale }
}

/**
 * L'aperçu de la charte, au centre de l'onglet : le téléphone de l'éditeur, à sa taille (tout
 * entier dans la hauteur du panneau, collé en haut pendant que les réglages défilent), avec un
 * article imaginaire aux couleurs, polices et formes du brouillon. À droite, sa barre d'outils :
 * l'appareil, clair ou sombre (pas de choix si la charte garde un seul mode) et le grand texte.
 * Un élément du téléphone mène à son réglage (onPick).
 */
export function StylePreview({
  appStyle: style,
  mode,
  onModeChange,
  largeText,
  onLargeTextChange,
  onPick,
  frame,
}: {
  // La place collée en haut (useStickyFrame) : sa position et sa hauteur.
  frame: { top: number; height: number } | null
  appStyle: AppStyle
  mode: StyleMode
  onModeChange: (mode: StyleMode) => void
  largeText: boolean
  onLargeTextChange: (large: boolean) => void
  onPick: (section: StyleSection) => void
}) {
  const brand = useBrandName()
  const [device, setDevice] = useState<PreviewSettings["device"]>("ios")
  const { holder, scale } = usePhoneScale(device, frame?.height ?? 0)
  const locked = styleModes(style).length === 1
  return (
    <div
      className="sticky flex justify-center gap-4 py-6"
      // eslint-disable-next-line no-restricted-syntax -- position et hauteur tirées d'une mesure (le panneau visible)
      style={frame ? { top: frame.top, height: frame.height } : undefined}
    >
      <div
        ref={holder}
        className="blocks-phone-holder style-preview"
        data-device={device}
        data-fields={style.fields}
        // eslint-disable-next-line no-restricted-syntax -- les valeurs de la charte du client, et la réduction mesurée
        style={vars({
          ...styleVariables(style, mode),
          "--blocks-device-scale": String(scale),
        })}
        // La souris seulement : au clavier, la colonne des sections mène aux mêmes réglages.
        onClick={(event) => {
          const target =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-style-section]")
              : null
          const section = target?.dataset.styleSection as
            StyleSection | undefined
          if (section) onPick(section)
        }}
      >
        <PhoneDevice
          device={device}
          theme={mode}
          largeText={largeText}
          appBar={
            <div className="style-topbar" data-style-section="roles">
              <span className="style-brand">{brand}</span>
              <MoreHorizontal aria-hidden />
            </div>
          }
          footer={
            <div
              className="style-tabbar"
              data-style-section="roles"
              aria-hidden
            >
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
      <PreviewToolbar>
        <DeviceTool value={device} onChange={setDevice} />
        {!locked && (
          <>
            <Separator className="my-1 w-5" />
            <ThemeTool value={mode} onChange={onModeChange} />
          </>
        )}
        <Separator className="my-1 w-5" />
        <LargeTextTool pressed={largeText} onChange={onLargeTextChange} />
      </PreviewToolbar>
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
      data-style-section="badges"
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
      <div className="style-cover" data-style-section="shapes" />
      <h1 className="style-title" data-style-section="fontRoles">
        {labels.title}
      </h1>
      <div className="style-meta" data-style-section="sizes">
        {labels.meta}
        {category && badge(category, labels.category)}
      </div>
      <p className="style-body" data-style-section="roles">
        {labels.bodyStart} <span className="style-link">{labels.link}</span>{" "}
        {labels.bodyEnd}
      </p>
      {badges.length > 0 && (
        <div className="style-badges" data-style-section="badges">
          {badges.map((item) => badge(item))}
        </div>
      )}
      <h2 className="style-heading" data-style-section="fontRoles">
        {labels.heading}
      </h2>
      <p className="style-body">{labels.body2}</p>
      <blockquote className="style-quote" data-style-section="fontRoles">
        {labels.quote}
      </blockquote>
      <div
        className="style-cover style-cover-small"
        data-style-section="shapes"
      />
      <p className="style-small style-caption" data-style-section="sizes">
        {labels.caption}
      </p>
      {style.tints.map((tint) => (
        <div
          key={tint.id}
          className="style-box"
          data-style-section="tints"
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
      <div className="style-card" data-style-section="shapes">
        <div className="style-card-image" />
        <div>
          <strong className="style-heading-font">{labels.card}</strong>
          <span className="style-small">{labels.cardMeta}</span>
        </div>
      </div>
      <p
        className="style-state style-small"
        data-state="success"
        data-style-section="roles"
      >
        <CircleCheck aria-hidden />
        {labels.saved}
      </p>
      <p
        className="style-state style-small"
        data-state="warning"
        data-style-section="roles"
      >
        <CircleAlert aria-hidden />
        {labels.offline}
      </p>
      <div className="style-field style-small" data-style-section="fields">
        <span>{labels.firstName}</span>
        <div className="style-input style-placeholder">
          {labels.firstNamePlaceholder}
        </div>
      </div>
      <div className="style-field style-small" data-style-section="fields">
        <span>{labels.search}</span>
        <div className="style-input" data-focus>
          {labels.searchValue}
        </div>
      </div>
      <div className="style-field style-small" data-style-section="fields">
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
          data-style-section="buttons"
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
