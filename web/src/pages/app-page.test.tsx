import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as styleApi from "@/lib/app-style/api"
import { neutralStyle } from "@/lib/app-style/style"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

vi.mock("@/lib/app-style/api", async (importOriginal) => {
  const actual = await importOriginal<typeof styleApi>()
  return {
    ...actual,
    getAppStyle: vi.fn(),
    saveStyle: vi.fn(),
    publishStyle: vi.fn(),
    discardStyle: vi.fn(),
  }
})

const labels = texts.appStyle
const neutral = neutralStyle(labels.neutral)

beforeEach(() => {
  vi.mocked(styleApi.getAppStyle).mockResolvedValue({
    draft: null,
    revision: 0,
    published: null,
    publishedAt: null,
  })
  vi.mocked(styleApi.saveStyle).mockResolvedValue(1)
  vi.mocked(styleApi.publishStyle).mockResolvedValue(1)
})

afterEach(() => vi.clearAllMocks())

describe("App : les onglets", () => {
  it("quatre onglets ; la charte graphique s'ouvre au départ ; les autres arrivent avec l'app", async () => {
    const { router } = await renderApp("/app")
    const tabs = await screen.findByRole("tablist", {
      name: texts.appPage.tabs.label,
    })
    expect(
      within(tabs)
        .getAllByRole("tab")
        .map((tab) => tab.textContent)
    ).toEqual([
      texts.appPage.tabs.identity,
      texts.appPage.tabs.style,
      texts.appPage.tabs.navigation,
      texts.appPage.tabs.layouts,
    ])
    expect(
      within(tabs).getByRole("tab", { name: texts.appPage.tabs.style })
    ).toHaveAttribute("aria-selected", "true")
    expect(
      await screen.findByRole("heading", { name: labels.colors.title })
    ).toBeVisible()

    fireEvent.click(
      within(tabs).getByRole("tab", { name: texts.appPage.tabs.navigation })
    )
    expect(await screen.findByText(texts.appPage.soon.title)).toBeVisible()
    await waitFor(() =>
      expect(router.state.location.search).toBe("?tab=navigation")
    )
  })

  it("reste réservée aux admins", async () => {
    await renderApp("/app", fakeAuth({ role: "editor" }))
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.adminOnly.title
    )
    expect(styleApi.getAppStyle).not.toHaveBeenCalled()
  })
})

describe("App : la charte graphique", () => {
  it("part de la charte neutre ; un changement s'enregistre de lui-même, avec la révision", async () => {
    await renderApp("/app")
    expect(await screen.findByText(labels.status.never)).toBeVisible()
    expect(screen.getByDisplayValue(labels.neutral.colors.black)).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: labels.darkMode.light }))
    await waitFor(() =>
      expect(styleApi.saveStyle).toHaveBeenCalledWith(
        { ...neutral, darkMode: "light" },
        0
      )
    )
    expect(await screen.findByText(labels.status.saved)).toBeVisible()
  })

  it("publier enregistre puis publie la charte", async () => {
    await renderApp("/app")
    await screen.findByText(labels.status.never)
    fireEvent.click(screen.getByRole("button", { name: labels.darkMode.dark }))
    fireEvent.click(screen.getByRole("button", { name: labels.publish }))
    await waitFor(() =>
      expect(styleApi.publishStyle).toHaveBeenCalledWith(
        { ...neutral, darkMode: "dark" },
        1
      )
    )
    expect(await screen.findByText(labels.published)).toBeVisible()
  })

  it("un nom déjà pris dans sa liste est refusé, et rien n'est enregistré", async () => {
    await renderApp("/app")
    const field = await screen.findByDisplayValue(
      labels.neutral.colors.lightGray
    )
    fireEvent.change(field, {
      target: { value: labels.neutral.colors.white.toUpperCase() },
    })
    expect(screen.getByText(labels.names.taken)).toBeVisible()
    fireEvent.blur(field)
    expect(field).toHaveValue(labels.neutral.colors.lightGray)
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(styleApi.saveStyle).not.toHaveBeenCalled()
  })
})
