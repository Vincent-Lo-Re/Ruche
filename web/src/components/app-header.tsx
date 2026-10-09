import { ExternalLink } from "lucide-react"
import { NavLink, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { HelpSearch } from "@/components/help/help-search"
import { useBrand } from "@/hooks/use-brand-name"
import { PaletteSheet } from "@/components/theme/palette-sheet"
import { ThemeMenu } from "@/components/theme/theme-menu"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { adminOnlySections, header, isInSection, sections } from "@/navigation"
import { texts } from "@/texts"

/**
 * Le header, sur toute la largeur des pages avec le menu (ADMIN § 7, « Un header sur toute la
 * largeur ») : à gauche « Site web » (le site du client, réglé dans Paramètres ; sans site, pas
 * de lien), Mon compte, Équipe et Paramètres (le NavigationMenu de shadcn ; Équipe et Paramètres
 * pour les admins) ; à droite la recherche de l'aide, le thème et, en dernier, les palettes.
 */
export function AppHeader() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const websiteUrl = useBrand()?.websiteUrl
  const links =
    profile?.role === "admin"
      ? header
      : header.filter((key) => !adminOnlySections.includes(key))

  return (
    <header className="flex h-(--header-height) w-full shrink-0 items-center gap-4 bg-background px-(--page-gap)">
      <NavigationMenu aria-label={texts.header.label}>
        <NavigationMenuList>
          {websiteUrl && (
            <NavigationMenuItem>
              <NavigationMenuLink
                href={websiteUrl}
                target="_blank"
                rel="noopener"
                className={navigationMenuTriggerStyle()}
              >
                {texts.header.website}
                <ExternalLink aria-hidden className="size-3.5" />
                <span className="sr-only"> {texts.header.newTab}</span>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )}
          {links.map((key) => (
            <NavigationMenuItem key={key}>
              <NavigationMenuLink
                render={<NavLink to={sections[key].path} />}
                active={isInSection(sections[key].path, pathname)}
                className={navigationMenuTriggerStyle()}
              >
                {texts.sections[key].title}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
      <div className="ml-auto flex items-center gap-2">
        <HelpSearch />
        <ThemeMenu />
        <PaletteSheet />
      </div>
    </header>
  )
}
