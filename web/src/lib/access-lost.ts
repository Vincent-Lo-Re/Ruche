import { isAccessLevelAccessLost } from "@/lib/access-levels"
import { isCategoryAccessLost } from "@/lib/categories"
import { isContentAccessLost } from "@/lib/contents/api"
import { isMediaAccessLost } from "@/lib/media/api"
import { isAccessLost } from "@/lib/team"

/**
 * Vrai si la base, la fonction « equipe » ou la fonction « files » répond que la personne n'a
 * plus accès (rôle retiré par un admin, compte supprimé, session fermée). Sans React.
 */
export function isAccessLostError(error: unknown): boolean {
  return (
    isAccessLost(error) ||
    isMediaAccessLost(error) ||
    isContentAccessLost(error) ||
    isAccessLevelAccessLost(error) ||
    isCategoryAccessLost(error)
  )
}
