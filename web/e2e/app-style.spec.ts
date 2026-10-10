// La charte graphique de l'app (ADMIN § 1, section « App ») : un admin choisit une police libre,
// publie ; l'admin copie la police dans le stockage de l'installation, et l'app lit la charte
// publiée.

import { fr as texts } from "../src/texts/fr.ts"
import { expect, signIn, test } from "./support/fixtures.ts"
import { localSupabase } from "./support/local-supabase.ts"
import { appStyle, resetAppStyle } from "./support/publication.ts"

const labels = texts.appStyle

test.afterEach(async () => {
  await resetAppStyle()
})

test("Charte de l'app : une police libre, publiée et copiée dans le stockage", async ({
  page,
  team,
}) => {
  await resetAppStyle()
  const admin = await team.createAdmin("Alice Admin")
  await page.goto("/")
  await signIn(page, admin)

  await page
    .getByRole("link", { name: texts.sections.app.title, exact: true })
    .click()
  await expect(page.getByText(labels.status.never)).toBeVisible()

  // La famille « Texte », dans la colonne de gauche.
  await page
    .getByRole("button", { name: labels.sections.groups.text, exact: true })
    .click()

  // La police « Titres » (grasse) passe à Inter.
  await page
    .getByRole("combobox", { name: labels.fonts.family })
    .first()
    .click()
  await page.getByRole("option", { name: "Inter", exact: true }).click()
  await expect(page.getByText(labels.status.saved)).toBeVisible()

  await page.getByRole("button", { name: labels.publish }).click()
  await expect(page.getByText(labels.published)).toBeVisible()

  const published = await appStyle()
  expect(published?.fonts[0]).toMatchObject({ family: "Inter", weight: 700 })
  const { apiUrl } = localSupabase()
  for (const file of ["inter/700.ttf", "inter/OFL.txt"]) {
    const response = await fetch(
      `${apiUrl}/storage/v1/object/public/polices/${file}`
    )
    expect(response.status, file).toBe(200)
  }
})
