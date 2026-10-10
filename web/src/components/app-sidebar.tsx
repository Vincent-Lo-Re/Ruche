import { NavLink, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useBrandName } from "@/hooks/use-brand-name"
import {
  adminOnlySections,
  isInSection,
  menu,
  sections,
  type SectionKey,
} from "@/navigation"
import { texts } from "@/texts"

/**
 * Le menu de gauche, toujours ouvert (docs/ADMINISTRATION.md § 7). Un éditeur n'y voit pas les
 * sections des admins, ni un groupe qui n'aurait plus rien (« App mobile »).
 */
export function AppSidebar() {
  const { profile } = useAuth()
  const groups =
    profile?.role === "admin"
      ? menu.groups
      : menu.groups
          .map((group) => ({
            ...group,
            items: group.items.filter(
              (key) => !adminOnlySections.includes(key)
            ),
          }))
          .filter((group) => group.items.length > 0)
  return (
    <Sidebar>
      {/* Sans en-tête (la marque est dans le header) : de l'air au-dessus du premier lien. */}
      <SidebarContent className="pt-2">
        <nav aria-label={texts.nav.label}>
          <SidebarGroup>
            <SidebarGroupContent>
              <MenuItems sectionKeys={menu.top} />
            </SidebarGroupContent>
          </SidebarGroup>
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <MenuItems sectionKeys={group.items} />
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      {/* En bas, sous un trait, le copyright au nom de la marque (l'avatar du membre est dans
          le header). */}
      <SidebarFooter>
        <Separator className="bg-sidebar-border" />
        <Copyright />
      </SidebarFooter>
    </Sidebar>
  )
}

function Copyright() {
  const brand = useBrandName()
  // Vide le temps de lire le nom de la marque.
  if (!brand) return null
  return (
    <p className="px-2 py-1 text-center text-xs text-sidebar-foreground/60">
      {texts.common.copyright(new Date().getFullYear(), brand)}
    </p>
  )
}

function MenuItems({ sectionKeys }: { sectionKeys: SectionKey[] }) {
  const { pathname } = useLocation()

  return (
    <SidebarMenu>
      {sectionKeys.map((key) => {
        const { path, icon: Icon } = sections[key]
        const { title } = texts.sections[key]
        return (
          <SidebarMenuItem key={key}>
            <SidebarMenuButton
              render={<NavLink to={path} end={path === "/"} />}
              isActive={isInSection(path, pathname)}
            >
              <Icon />
              <span>{title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
