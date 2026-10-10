import { cn } from "cn"
import { ExternalLink } from "lucide-react"
import { NavLink, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { AccountMenu } from "@/components/account-menu"
import { BrandLogo } from "@/components/brand-logo"
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
 * largeur ») : à gauche le logotype de la marque (sinon son nom), lien vers le Tableau de bord,
 * dans une colonne de la largeur du menu ; puis « Site web » (le site du client, réglé dans Paramètres ; sans site, pas
 * de lien), Mon compte, Équipe et Paramètres (le NavigationMenu de shadcn ; Équipe et Paramètres
 * pour les admins) ; à droite la recherche de l'aide, le thème, les palettes et, tout à droite,
 * l'avatar du membre et son menu.
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
    <header className="flex h-(--header-height) w-full shrink-0 items-center gap-(--page-gap) bg-background px-(--page-gap)">
      {/* Au-dessus du menu, de sa largeur : les liens suivants partent au bord du contenu. Le
          header suit le thème : la version du logotype pour ce fond. */}
      <NavLink
        to={sections.home.path}
        className="flex h-12 w-(--sidebar-width) shrink-0 items-center rounded-md px-2 text-2xl font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <BrandLogo kind="logotype" surface="theme" className="h-11" />
      </NavLink>
      <NavigationMenu aria-label={texts.header.label}>
        {/* Un peu d'air entre les liens. */}
        <NavigationMenuList className="gap-2">
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
                // Le lien choisi, comme l'élément choisi du menu de gauche (--nav-active).
                className={cn(
                  navigationMenuTriggerStyle(),
                  "data-active:bg-nav-active data-active:text-nav-active-foreground data-active:hover:bg-nav-active data-active:focus:bg-nav-active"
                )}
              >
                {texts.sections[key].title}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
      <div className="ml-auto flex items-center gap-2">
        <HelpSearch />
        {/* Les deux icônes côte à côte, plus serrées que la recherche. */}
        <div className="flex items-center">
          <ThemeMenu />
          <PaletteSheet />
        </div>
        <AccountMenu />
      </div>
    </header>
  )
}
