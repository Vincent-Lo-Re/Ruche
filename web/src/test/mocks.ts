import { vi } from "vitest"

// Les appels à la base simulés, partagés par les tests des pages : chaque fonction qu'un test
// règle est un vi.fn (vide, ou qui rend une liste vide, la réussite), les autres restent réelles.
// Dans un test : vi.mock("@/lib/contents/api", (original) => mocks.contentsApi(original)), puis
// vi.mocked(api.getContent).mockResolvedValue(…).

type Original = <T>() => Promise<T>

export async function contentsApi(original: Original) {
  return {
    ...(await original<typeof import("@/lib/contents/api")>()),
    listContents: vi.fn(async () => []),
    findPageBySlug: vi.fn(async () => null),
    findContentByTitle: vi.fn(async () => null),
    reorderContents: vi.fn(async () => {}),
    getMediaByIds: vi.fn(async () => []),
    createContent: vi.fn(),
    getContent: vi.fn(async () => null),
    lockTake: vi.fn(),
    lockStatus: vi.fn(),
    saveDraft: vi.fn(async () => ({
      rev: 2,
      savedAt: "2026-09-28T08:01:00Z",
    })),
    lockRelease: vi.fn(async () => true),
    lockReleaseOnExit: vi.fn(),
    subscribeLock: vi.fn(() => () => {}),
    lockHeartbeat: vi.fn(async () => true),
  }
}

export async function publicationApi(original: Original) {
  return {
    ...(await original<typeof import("@/lib/contents/publication")>()),
    getPublication: vi.fn(async () => null),
    listVersions: vi.fn(async () => []),
    publishContent: vi.fn(),
    scheduleContent: vi.fn(),
    unscheduleContent: vi.fn(),
    unpublishContent: vi.fn(),
    revertToVersion: vi.fn(),
    trashContent: vi.fn(),
    restoreContent: vi.fn(),
  }
}

export async function templatesApi(original: Original) {
  return {
    ...(await original<typeof import("@/lib/contents/templates")>()),
    listStarters: vi.fn(async () => []),
    listTemplates: vi.fn(async () => []),
    listTemplateUses: vi.fn(async () => []),
    getTemplatesByIds: vi.fn(async () => []),
    getTemplateOutdated: vi.fn(async () => []),
    createTemplate: vi.fn(),
    createTemplateFrom: vi.fn(),
    pushTemplate: vi.fn(),
    detachTemplateEverywhere: vi.fn(),
    templateUsage: vi.fn(async () => new Map()),
    getTemplateUses: vi.fn(async () => []),
  }
}

export async function mediaApi(original: Original) {
  return {
    ...(await original<typeof import("@/lib/media/api")>()),
    kickFiles: vi.fn(async () => {}),
    getPreviewUrls: vi.fn(async (keys: string[]) =>
      Object.fromEntries(keys.map((key) => [key, `blob:${key}`]))
    ),
    listMedia: vi.fn(),
    getStorageUsed: vi.fn(),
    getLatestAudit: vi.fn(),
    getMediaUses: vi.fn(),
    getMediaOutdated: vi.fn(),
    pushMediaTexts: vi.fn(),
    updateMedia: vi.fn(),
    trashMedia: vi.fn(),
    restoreMedia: vi.fn(),
    callFiles: vi.fn(),
    createMedia: vi.fn(),
    confirmMedia: vi.fn(),
    discardUpload: vi.fn(),
    getMediaVerdicts: vi.fn(),
    getMedia: vi.fn(),
    replaceMedia: vi.fn(),
    replaceMediaLive: vi.fn(),
    listTrash: vi.fn(),
    restoreTrashItem: vi.fn(),
    emptyTrash: vi.fn(),
  }
}
