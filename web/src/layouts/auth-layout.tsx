import { Outlet } from "react-router"

import { AnimatedMonogram } from "@/components/auth/animated-monogram"
import { BrandLogo } from "@/components/brand-logo"
import { Card, CardContent } from "@/components/ui/card"
import { FieldDescription } from "@/components/ui/field"
import { useBrand, useBrandName } from "@/hooks/use-brand-name"
import { texts } from "@/texts"

/**
 * Pages de connexion, sans menu (modèle « login-04 » de shadcn) : sur le fond gris, une carte ; à
 * gauche, le logotype puis le formulaire ; à droite, sur grand écran, l'image de l'écran de
 * connexion (Paramètres, sinon celle de Ruche), sous un voile sombre, avec le monogramme. Sous la
 * carte, le ©.
 */
export function AuthLayout() {
  const brand = useBrandName()
  return (
    // La page tient dans la fenêtre : si une étape est trop haute (le QR code sur un petit
    // écran), c'est le contenu de la carte qui défile, sous le logotype, pas la page.
    <main className="flex h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="flex max-h-full min-h-0 w-full max-w-sm flex-col gap-6 md:max-w-4xl">
        <Card className="min-h-0 overflow-hidden p-0">
          <CardContent className="flex min-h-0 p-0">
            <div className="flex min-h-0 w-full flex-col gap-6 p-6 md:w-1/2 md:p-8">
              <div className="flex min-h-14 shrink-0 justify-center text-4xl font-medium">
                <BrandLogo kind="logotype" surface="theme" className="h-14" />
              </div>
              {/* Ce qui défile ; -m-1 p-1 : les anneaux du focus restent visibles au bord. */}
              <div className="-m-1 min-h-0 overflow-y-auto p-1">
                <Outlet />
              </div>
            </div>
            <AuthAside />
          </CardContent>
        </Card>
        {/* Le nom de la marque lu : pas de « © 2026 » seul le temps du chargement. */}
        {brand && (
          <FieldDescription className="shrink-0 px-6 text-center">
            {texts.common.copyright(new Date().getFullYear(), brand)}
          </FieldDescription>
        )}
      </div>
    </main>
  )
}

function AuthAside() {
  const brand = useBrand()
  // Pas encore lue : la colonne vide, sans montrer le fond seul puis l'image.
  if (!brand) return <div className="hidden w-1/2 bg-muted md:block" />
  return (
    // Sous la classe dark : le fond et le voile prennent celui du menu (la carte sombre de la
    // palette). Sans image envoyée, ce fond seul : aucune image de Ruche (09/10/2026).
    <div className="dark relative hidden w-1/2 items-center justify-center bg-card md:flex">
      {brand.screenImage && (
        <>
          <img
            src={brand.screenImage.url}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-card/70" />
        </>
      )}
      {/* text-foreground : les initiales prennent le texte du fond sombre, pas celui hérité de
          la page (clair), qui les rendrait presque noires. */}
      <div className="relative text-foreground">
        <AnimatedMonogram
          motions={brand.monogramMotion ? brand.monogramMotions : []}
          className="h-32 text-8xl"
        />
      </div>
    </div>
  )
}
