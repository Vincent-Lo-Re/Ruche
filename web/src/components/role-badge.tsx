import { cn } from "cn"
import { UserPen, UserStar, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { TeamRole } from "@/lib/team"
import { texts } from "@/texts"

const roleIcons: Record<TeamRole, LucideIcon> = {
  admin: UserStar,
  editor: UserPen,
}

/**
 * Le rôle d'un membre en pastille, son icône devant le mot, dans la couleur des boutons de la
 * palette : en grand en haut à droite de Mon compte (les lecteurs d'écran entendent « Rôle : … »),
 * à sa taille dans la colonne « Rôle » de La team.
 */
export function RoleBadge({
  role,
  large = false,
}: {
  role: TeamRole
  large?: boolean
}) {
  const Icon = roleIcons[role]
  return (
    <Badge className={cn(large && "h-8 gap-1.5 px-3 text-sm [&>svg]:size-4!")}>
      <Icon data-icon="inline-start" aria-hidden />
      {large && (
        <span className="sr-only">{texts.account.profile.rolePrefix}</span>
      )}
      {texts.roles[role]}
    </Badge>
  )
}
