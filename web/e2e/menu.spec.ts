// Le menu de gauche, toujours ouvert, avec le copyright en bas ; le membre est tout à droite du
// header : son avatar seul ouvre le menu du compte.

// Les parcours tournent en français (VITE_DEFAULT_LANGUAGE de playwright.config.ts).
import { fr as texts } from "../src/texts/fr.ts"
import { accountMenuButton, expect, signIn, test } from "./support/fixtures.ts"

test("l'avatar seul dans le header, son menu ; le menu ne se replie pas", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Alice Admin")
  await page.goto("/")
  await signIn(page, admin)

  // Ni nom ni rôle à côté de l'avatar : ils sont dans son menu, avec l'e-mail.
  const member = accountMenuButton(page)
  await expect(member).not.toContainText("Alice Admin")
  await expect(member).not.toContainText(texts.roles.admin)
  await member.click()
  const menu = page.getByRole("menu")
  await expect(menu).toContainText("Alice Admin")
  await expect(menu).toContainText(admin.email)
  await expect(menu).toContainText(texts.roles.admin)
  await page.keyboard.press("Escape")
  await expect(menu).toHaveCount(0)

  // Ni bouton ni raccourci pour le replier : il garde sa largeur et ses noms.
  const column = page.locator('[data-slot="sidebar-inner"]')
  const width = (await column.boundingBox())?.width
  await page.keyboard.press("ControlOrMeta+b")
  await page.getByText(texts.nav.groups.contents).click()
  expect((await column.boundingBox())?.width).toBe(width)
  await expect(
    page.getByRole("link", { name: texts.sections.blog.title })
  ).toContainText(texts.sections.blog.title)
})
