import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import {
  appStyleKey,
  discardStyle,
  getAppStyle,
  publishStyle,
  saveStyle,
  StyleError,
  type AppStyleRow,
} from "@/lib/app-style/api"
import { styleProblems } from "@/lib/app-style/problems"
import { neutralStyle, sameStyle, type AppStyle } from "@/lib/app-style/style"
import { errorMessage } from "@/lib/errors"
import { texts } from "@/texts"

const labels = texts.appStyle

/** Le temps sans changement avant d'enregistrer le brouillon. */
const SAVE_DELAY_MS = 700

export type DraftStatus = "saved" | "saving" | "failed" | "blocked"

/**
 * Le brouillon de la charte, composé dans l'onglet : chaque changement s'enregistre de lui-même
 * peu après (style_save, avec la révision attendue), sauf si la charte a un problème que la base
 * refuserait (un nom en double). Publier enregistre d'abord ce qui reste, copie les polices, puis
 * publie ; annuler revient à la version publiée. Si un autre admin a changé la charte entre-temps,
 * elle est relue.
 */
export function useStyleDraft(row: AppStyleRow) {
  const queryClient = useQueryClient()
  const neutral = useMemo(() => neutralStyle(labels.neutral), [])
  const [style, setStyle] = useState<AppStyle>(row.draft ?? neutral)
  // Ce qui est enregistré, et sa révision.
  const [saved, setSaved] = useState<AppStyle>(row.draft ?? neutral)
  const revision = useRef(row.revision)
  const [failed, setFailed] = useState(false)

  const problems = useMemo(() => styleProblems(style), [style])

  // Reprend la charte de la base (après une annulation, ou si elle a changé ailleurs).
  const reload = useCallback(async () => {
    const fresh = await queryClient.fetchQuery({
      queryKey: appStyleKey,
      queryFn: getAppStyle,
    })
    setSaved(fresh.draft ?? neutral)
    revision.current = fresh.revision
    setStyle(fresh.draft ?? neutral)
    setFailed(false)
  }, [neutral, queryClient])

  const onWriteError = useCallback(
    async (error: unknown) => {
      if (error instanceof StyleError && error.code === "conflit_revision") {
        toast.error(errorMessage(error))
        await reload()
        return
      }
      setFailed(true)
      toast.error(errorMessage(error))
    },
    [reload]
  )

  const save = useMutation({
    mutationFn: (draft: AppStyle) => saveStyle(draft, revision.current),
    onSuccess: (next, draft) => {
      revision.current = next
      setSaved(draft)
      setFailed(false)
    },
    onError: onWriteError,
  })

  const dirty = !sameStyle(style, saved)
  const blocked = problems.length > 0

  // Enregistre le brouillon un instant après le dernier changement.
  useEffect(() => {
    if (!dirty || blocked || save.isPending || failed) return
    const timer = setTimeout(() => save.mutate(style), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [blocked, dirty, failed, save, style])

  const publish = useMutation({
    mutationFn: async () => {
      if (!sameStyle(style, saved)) {
        revision.current = await saveStyle(style, revision.current)
        setSaved(style)
      }
      await publishStyle(style, revision.current)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: appStyleKey })
      toast.success(labels.published)
    },
    onError: onWriteError,
  })

  const discard = useMutation({
    mutationFn: () => discardStyle(revision.current),
    onSuccess: async () => {
      await reload()
      await queryClient.invalidateQueries({ queryKey: appStyleKey })
      toast.success(labels.discarded)
    },
    onError: onWriteError,
  })

  const change = useCallback((update: (current: AppStyle) => AppStyle) => {
    setFailed(false)
    setStyle(update)
  }, [])

  const status: DraftStatus = blocked
    ? "blocked"
    : failed
      ? "failed"
      : dirty || save.isPending
        ? "saving"
        : "saved"

  return {
    style,
    change,
    status,
    problems,
    // Ce que voient les lecteurs : la charte publiée, sinon la neutre.
    modified: !sameStyle(style, row.published ?? neutral),
    publish,
    discard,
  }
}
