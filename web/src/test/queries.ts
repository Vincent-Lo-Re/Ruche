import { screen, within, type ByRoleMatcher } from "@testing-library/react"

// Chercher un élément par son rôle et son nom, en une ligne : dans toute la page, ou dans scope.
// role, findRole et queryRole font ce que font getByRole, findByRole et queryByRole de Testing
// Library avec { name }.

type Name = string | RegExp

const inside = (scope?: HTMLElement) => (scope ? within(scope) : screen)

export const role = (kind: ByRoleMatcher, name: Name, scope?: HTMLElement) =>
  inside(scope).getByRole(kind, { name })

export const findRole = (
  kind: ByRoleMatcher,
  name: Name,
  scope?: HTMLElement
) => inside(scope).findByRole(kind, { name })

export const queryRole = (
  kind: ByRoleMatcher,
  name: Name,
  scope?: HTMLElement
) => inside(scope).queryByRole(kind, { name })
