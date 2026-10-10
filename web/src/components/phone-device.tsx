import { BatteryFull, Signal, Wifi } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"

import type { PreviewSettings } from "@/lib/editor/preview"
import { texts } from "@/texts"

// Le cadre, l'écran et les mesures des téléphones.
import "@/blocks/components/preview.css"

const labels = texts.editor.preview

/**
 * Un téléphone (preview.css) : le cadre de l'appareil, la barre d'état, la barre du haut de
 * l'app, ce qui défile, puis la barre d'accueil. Ses mesures viennent de l'élément qui le contient
 * (data-device sur .blocks-preview-layout ou .blocks-phone-holder). L'aperçu de l'éditeur et
 * celui de la charte de l'app.
 */
export function PhoneDevice({
  device,
  theme,
  largeText,
  appBar,
  footer,
  variables,
  children,
}: Pick<PreviewSettings, "device" | "theme" | "largeText"> & {
  // La charte de l'app en variables CSS (lib/app-style/variables.ts), posées sur le téléphone.
  variables?: Record<string, string>
  appBar?: ReactNode
  // Sous ce qui défile, au-dessus de la barre d'accueil (la barre de navigation de l'app).
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      role="region"
      aria-label={labels.screen[device]}
      className="blocks-device"
      data-device={device}
      data-blocks-theme={theme}
      data-large-text={largeText || undefined}
      // eslint-disable-next-line no-restricted-syntax -- les valeurs de la charte de l'app, choisies par le client
      style={variables as CSSProperties | undefined}
    >
      <div className="blocks-screen">
        <div aria-hidden className="blocks-status">
          <span>{labels.time[device]}</span>
          <span className="blocks-camera" />
          <span className="blocks-status-icons">
            <Signal />
            <Wifi />
            <BatteryFull />
          </span>
        </div>
        {appBar}
        <div className="blocks-screen-scroll">{children}</div>
        {footer}
        <div aria-hidden className="blocks-home" />
      </div>
    </div>
  )
}
