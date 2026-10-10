import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { texts } from "@/texts"

/**
 * Le pied gris d'une carte de réglages : « Enregistrer », sur toute la largeur, actif seulement
 * quand quelque chose a changé (dirty) et pas pendant l'enregistrement.
 */
export function SaveFooter({
  pending,
  dirty,
}: {
  pending: boolean
  dirty: boolean
}) {
  return (
    <CardFooter>
      <Button type="submit" className="w-full" disabled={pending || !dirty}>
        {pending ? <Spinner /> : <Save aria-hidden />}
        {texts.common.save}
      </Button>
    </CardFooter>
  )
}
