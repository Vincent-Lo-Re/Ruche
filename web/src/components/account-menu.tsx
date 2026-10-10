import { LogOut } from "lucide-react"
import { useNavigate } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { displayName, initial } from "@/lib/people"
import { authPaths, sections } from "@/navigation"
import { texts } from "@/texts"

/**
 * Le membre, tout à droite du header : son avatar seul (initiale du prénom), aux couleurs du
 * header ; il ouvre son menu (nom, e-mail et rôle, « Mon compte », puis « Se déconnecter »).
 */
export function AccountMenu() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  if (!profile) return null
  const name = displayName(profile)
  const AccountIcon = sections.account.icon

  return (
    <DropdownMenu>
      {/* Le bouton se lit par ce qu'il fait, pas par l'initiale. */}
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar aria-hidden>
          <AvatarFallback>{initial(profile)}</AvatarFallback>
        </Avatar>
        <span className="sr-only">{texts.accountMenu.open}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 text-sm">
            <span className="truncate text-foreground">{name}</span>
            {name !== profile.email && (
              <span className="truncate text-xs font-normal">
                {profile.email}
              </span>
            )}
            <span className="truncate text-xs font-normal">
              {texts.roles[profile.role]}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void navigate(sections.account.path)}>
          <AccountIcon />
          {texts.sections.account.title}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void navigate(authPaths.signOut)}>
          <LogOut />
          {texts.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
