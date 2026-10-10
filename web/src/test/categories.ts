import { fireEvent, screen, within } from "@testing-library/react"

import { texts } from "@/texts"

const words = texts.categories.picker

/** Le champ des catégories d'un contenu (CategoryPicker), dans `container`. */
export function categoryInput(container: HTMLElement) {
  return within(container).getByPlaceholderText(words.placeholder)
}

/** Choisit une catégorie en tapant son nom, puis en cliquant sur la proposition. */
export async function chooseCategory(container: HTMLElement, name: string) {
  const input = categoryInput(container)
  fireEvent.focus(input)
  fireEvent.click(input)
  fireEvent.change(input, { target: { value: name } })
  fireEvent.keyDown(input, { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name }))
}

/** La pastille d'une catégorie choisie : son bouton « Retirer « … » ». */
export function chosenCategory(container: HTMLElement, name: string) {
  return within(container).queryByRole("button", { name: words.remove(name) })
}
