import { UserPen, UserStar, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { TeamRole } from "@/lib/team"
import { texts } from "@/texts"

const roleIcons: Record<TeamRole, LucideIcon> = {
  admin: UserStar,
  editor: UserPen,
}

/**
 * Le rôle d'un membre en pastille, son icône devant le mot (Mon compte, à droite de
 * l'intitulé « Nom ») ; les lecteurs d'écran entendent « Rôle : … ».
 */
export function RoleBadge({ role }: { role: TeamRole }) {
  const Icon = roleIcons[role]
  return (
    <Badge variant="secondary">
      <Icon data-icon="inline-start" aria-hidden />
      <span className="sr-only">{texts.account.profile.rolePrefix}</span>
      {texts.roles[role]}
    </Badge>
  )
}
