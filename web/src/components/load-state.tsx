import { TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { texts } from "@/texts"

/**
 * Tant qu'une liste n'a pas pu être chargée : des lignes grises pendant le chargement, sinon le
 * message d'échec (l'`Alert` de shadcn, avec la raison) et « Réessayer ». Le reste de la page ne change pas.
 */
export function LoadState({
  query,
  failed,
  rows = 2,
  rowClassName = "h-10 w-full",
  skeleton,
}: {
  query: { isError: boolean; error: Error | null; refetch: () => unknown }
  // « Les … n'ont pas pu être chargés. »
  failed: string
  rows?: number
  rowClassName?: string
  // Pour une grille : les cases grises à la place des lignes.
  skeleton?: ReactNode
}) {
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>{failed}</AlertTitle>
        {query.error?.message && (
          <AlertDescription>{query.error.message}</AlertDescription>
        )}
        <AlertAction>
          <Button variant="outline" size="xs" onClick={() => query.refetch()}>
            {texts.common.retry}
          </Button>
        </AlertAction>
      </Alert>
    )
  }
  return (
    skeleton ?? (
      <div className="space-y-2" aria-label={texts.common.loading}>
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className={rowClassName} />
        ))}
      </div>
    )
  )
}

/**
 * Une relecture qui a échoué alors que la liste est déjà là : la liste reste affichée, avec ce
 * message et « Réessayer ». Rien tant que la relecture n'a pas échoué.
 */
export function RefreshFailed({
  query,
  text,
}: {
  query: { isError: boolean; refetch: () => unknown }
  text: string
}) {
  if (!query.isError) return null
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertDescription className="flex flex-wrap items-center gap-x-2">
        {text}
        <Button
          variant="link"
          className="h-auto p-0"
          onClick={() => query.refetch()}
        >
          {texts.common.retry}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
