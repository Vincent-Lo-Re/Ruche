import { toast } from "sonner"

import type { Restored } from "@/lib/contents/publication"
import { texts } from "@/texts"

type ToastAction = { label: string; onClick: () => void }

/**
 * Ce qu'on dit après avoir restauré un contenu : son titre changé (un autre l'avait pris), son
 * adresse retirée (une autre page l'avait prise), sinon le message de réussite (success, s'il est
 * donné : une restauration en masse a déjà dit le sien). action : « Ouvrir », par exemple.
 */
export function announceRestore(
  name: string,
  { addressRemoved, renamedTo }: Pick<Restored, "addressRemoved" | "renamedTo">,
  {
    success,
    description,
    action,
  }: { success?: string; description?: string; action?: ToastAction } = {}
) {
  if (renamedTo !== null)
    toast.warning(texts.trash.restoredRenamed(name, renamedTo), { action })
  if (addressRemoved)
    toast.warning(texts.trash.restoredWithoutAddress(name), { action })
  else if (renamedTo === null && success)
    toast.success(success, { description, action })
}
