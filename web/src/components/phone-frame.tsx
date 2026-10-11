import "@/blocks/components/preview.css"

import { cn } from "cn"
import { BatteryFull, Signal, Wifi } from "lucide-react"
import type { ReactNode } from "react"

import type { PreviewSettings } from "@/lib/editor/preview"
import { texts } from "@/texts"

const labels = texts.editor.preview

/**
 * Le téléphone des aperçus (preview.css) : son cadre, toujours sombre, la barre d'état, l'écran au
 * thème choisi (data-blocks-theme) et la barre d'accueil. L'éditeur des contenus y met la barre de
 * l'app et l'article qui défile (`children`) ; App mobile › Identité, l'écran de chargement, posé
 * sous la barre d'état sur tout l'écran (`backdrop`). Sa taille vient de l'appareil (data-device) ;
 * il se réduit par --blocks-device-scale (posé autour de lui, ou par `className`).
 */
export function PhoneFrame({
  device,
  theme,
  largeText = false,
  role,
  label,
  className,
  backdrop,
  children,
}: {
  device: PreviewSettings["device"]
  theme: PreviewSettings["theme"]
  largeText?: boolean
  // Une zone de l'éditeur (region), ou une image (img) dans un aperçu.
  role: "region" | "img"
  label: string
  className?: string
  // Sous la barre d'état et la barre d'accueil, sur tout l'écran.
  backdrop?: ReactNode
  // Entre les deux barres ; sans rien, l'écran reste vide.
  children?: ReactNode
}) {
  return (
    <div
      role={role}
      aria-label={label}
      className={cn("blocks-device", className)}
      data-device={device}
      data-blocks-theme={theme}
      data-large-text={largeText || undefined}
    >
      <div className="blocks-screen">
        {backdrop}
        <div aria-hidden className="blocks-status">
          <span>{labels.time[device]}</span>
          <span className="blocks-camera" />
          <span className="blocks-status-icons">
            <Signal />
            <Wifi />
            <BatteryFull />
          </span>
        </div>
        {children ?? <div className="flex-1" />}
        <div aria-hidden className="blocks-home relative" />
      </div>
    </div>
  )
}
