import { cn } from "cn"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { BrandLogo } from "@/components/brand-logo"
import { useBrandName } from "@/hooks/use-brand-name"
import { useMonogramSvg } from "@/hooks/use-monogram-svg"
import type { BrandSurface, IdentityTarget } from "@/lib/admin-identity"
import {
  motionLoop,
  penTiming,
  type Motion,
  type MotionPhase,
} from "@/lib/monogram-motion"

/**
 * Le monogramme de l'écran de connexion, sur l'image de droite (version pour fond sombre, aux
 * couleurs de la palette), animé en boucle : les animations cochées par un admin (`motions`,
 * Paramètres ; vide : immobile), séparées par des pauses de 4 secondes (lib/monogram-motion.ts,
 * index.css). Un SVG compatible est montré en ligne pour animer ses formes ; un autre fichier, ou
 * le nom sans logo, ne joue que les animations de tout le monogramme. Le reflet passe sur une
 * copie blanche posée par-dessus. Le tracé partage son temps entre les traits selon leur longueur
 * (penTiming), mesurée une fois le SVG sur la page. Immobile si l'ordinateur demande moins
 * d'animations (index.css).
 * `className` : sa hauteur, et la taille des initiales quand aucun monogramme n'a été envoyé.
 * `target` et `surface` : le monogramme de l'app (écran de chargement), dans la version pour le
 * fond du téléphone, plutôt que celui de l'admin pour fond sombre.
 */
export function AnimatedMonogram({
  motions,
  className,
  target = "admin",
  surface = "dark",
}: {
  motions: readonly Motion[]
  className: string
  target?: IdentityTarget
  surface?: BrandSurface
}) {
  const animated = motions.length > 0
  const name = useBrandName(target)
  const { url, svg } = useMonogramSvg(target, surface)
  // Immobile : une seule étape, la pause, sans fin.
  const loop = useMemo(
    () =>
      animated
        ? motionLoop(svg.data ?? null, motions)
        : [{ phase: "rest" as const, ms: Infinity }],
    [animated, svg.data, motions]
  )
  const [step, setStep] = useState(0)
  const drawing = useRef<HTMLDivElement>(null)
  const phase: MotionPhase = loop[step % loop.length].phase

  useEffect(() => {
    if (!animated) return
    const timer = window.setTimeout(
      () => setStep((current) => current + 1),
      loop[step % loop.length].ms
    )
    return () => window.clearTimeout(timer)
  }, [animated, step, loop])

  // Le moment, la durée et la longueur de chaque trait (index.css : --pen-delay, --pen-ms,
  // --pen-length).
  const markup = svg.data?.markup
  useLayoutEffect(() => {
    const pens = [
      // Le monogramme seul, pas la copie du reflet.
      ...(drawing.current?.querySelectorAll<SVGElement>(
        ':scope > [role="img"] [data-pen]'
      ) ?? []),
    ]
    const lengths = pens.map((pen) => {
      try {
        return pen instanceof SVGGeometryElement ? pen.getTotalLength() : 0
      } catch {
        return 0
      }
    })
    penTiming(lengths).forEach(({ delay, ms }, index) => {
      const pen = pens[index]
      pen.style.setProperty("--pen-delay", `${delay}ms`)
      pen.style.setProperty("--pen-ms", `${ms}ms`)
      // La vraie longueur plutôt que pathLength, que Chrome applique mal à un cercle.
      if (lengths[index] > 0) {
        pen.removeAttribute("pathLength")
        pen.style.setProperty("--pen-length", String(lengths[index]))
      }
    })
  }, [markup])

  // Le temps de lire le fichier : rien, plutôt que l'image puis sa version animée.
  if (url !== null && svg.isPending) return null
  const mark = svg.data ? (
    <div
      role="img"
      aria-label={name}
      className="h-full"
      // Un SVG passé par cleanSvg (lib/media/svg.ts), comme à son envoi.
      dangerouslySetInnerHTML={{ __html: svg.data.markup }}
    />
  ) : (
    <BrandLogo
      kind="monogram"
      surface={surface}
      target={target}
      className="h-full"
    />
  )
  return (
    <div
      ref={drawing}
      data-monogram
      data-motion-phase={phase}
      // Les initiales (sans monogramme envoyé) : grandes, en gras, au centre.
      className={cn(
        "relative flex items-center justify-center leading-none font-semibold",
        className
      )}
    >
      {mark}
      {phase === "shine" && (
        <div
          data-shine
          aria-hidden
          // Centré comme le monogramme, pour se poser exactement dessus ; plus grand, pour que
          // la lumière autour des formes ne soit pas coupée (p-6 le garde à sa taille).
          className="absolute -inset-6 flex items-center justify-center p-6"
        >
          {mark}
        </div>
      )}
    </div>
  )
}
