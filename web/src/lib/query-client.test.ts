import { describe, expect, it, vi } from "vitest"

import { ContentError } from "@/lib/contents/api"
import { createQueryClient } from "@/lib/query-client"

describe("perte d'accès, pour toute l'admin", () => {
  it("une lecture ou un enregistrement qui répond « plus d'accès » relit la fiche du membre", async () => {
    const client = createQueryClient()
    const invalidate = vi.spyOn(client, "invalidateQueries")

    await client
      .fetchQuery({
        queryKey: ["liste"],
        queryFn: () => Promise.reject(new ContentError("reserve_a_l_equipe")),
        retry: false,
      })
      .catch(() => {})
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["profile"] })

    invalidate.mockClear()
    await client
      .getMutationCache()
      .build(client, {
        mutationFn: () =>
          Promise.reject(new ContentError("reserve_a_l_equipe")),
      })
      .execute(undefined)
      .catch(() => {})
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["profile"] })

    // Une autre erreur ne relit rien.
    invalidate.mockClear()
    await client
      .fetchQuery({
        queryKey: ["autre"],
        queryFn: () => Promise.reject(new ContentError("verrou_perdu")),
        retry: false,
      })
      .catch(() => {})
    expect(invalidate).not.toHaveBeenCalled()
  })
})
