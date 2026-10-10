import { Plus } from "lucide-react"

import {
  ColorField,
  ColorSelect,
  NameInput,
  ReadabilityBadge,
} from "@/components/app-style/style-fields"
import {
  SortableEntries,
  SortableEntry,
} from "@/components/app-style/sortable-entry"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import type { ReadabilityIssue } from "@/lib/app-style/problems"
import {
  colorInUse,
  colorRoleGroups,
  freeName,
  MAX_COLORS,
  newColor,
  readOn,
  type AppStyle,
  type ColorRole,
  type StyleMode,
} from "@/lib/app-style/style"
import { texts } from "@/texts"

const labels = texts.appStyle

type Change = (update: (style: AppStyle) => AppStyle) => void

/** La palette : chaque couleur, son nom, sa valeur en clair et en sombre ; rangée à la main. */
export function PaletteCard({
  appStyle: style,
  change,
}: {
  appStyle: AppStyle
  change: Change
}) {
  const updateColor = (
    id: string,
    patch: Partial<AppStyle["colors"][number]>
  ) =>
    change((current) => ({
      ...current,
      colors: current.colors.map((color) =>
        color.id === id ? { ...color, ...patch } : color
      ),
    }))
  return (
    <Card className="pb-0">
      <CardContent>
        <SortableEntries
          items={style.colors}
          onReorder={(colors) => change((current) => ({ ...current, colors }))}
        >
          {(color) => (
            <SortableEntry
              key={color.id}
              item={color}
              removeBlocked={
                colorInUse(style, color.id) ? labels.colors.inUse : null
              }
              onRemove={() =>
                change((current) => ({
                  ...current,
                  colors: current.colors.filter((c) => c.id !== color.id),
                }))
              }
            >
              <div className="flex flex-wrap items-start gap-2">
                <NameInput
                  value={color.name}
                  label={labels.colors.name}
                  others={style.colors.filter((c) => c.id !== color.id)}
                  onChange={(name) => updateColor(color.id, { name })}
                />
                {(["light", "dark"] as const).map((mode) => (
                  <ColorField
                    key={mode}
                    value={color[mode]}
                    label={labels.colors.pick(color.name, labels.colors[mode])}
                    onChange={(value) =>
                      updateColor(color.id, { [mode]: value })
                    }
                  />
                ))}
              </div>
            </SortableEntry>
          )}
        </SortableEntries>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          disabled={style.colors.length >= MAX_COLORS}
          onClick={() =>
            change((current) => ({
              ...current,
              colors: [
                ...current.colors,
                newColor(freeName(labels.colors.newName, current.colors)),
              ],
            }))
          }
        >
          <Plus aria-hidden />
          {labels.colors.add}
        </Button>
      </CardFooter>
    </Card>
  )
}

/** Où va chaque couleur : par groupe, un choix dans la palette, et sa lisibilité. */
export function ColorRolesCard({
  appStyle: style,
  mode,
  issues,
  change,
}: {
  appStyle: AppStyle
  mode: StyleMode
  issues: readonly ReadabilityIssue[]
  change: Change
}) {
  const roleIssues = (role: ColorRole) =>
    issues.filter((issue) => issue.kind === "role" && issue.role === role)
  return (
    <Card>
      <CardContent className="space-y-5">
        {colorRoleGroups.map(({ group, roles }) => (
          <section key={group} className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase">
              {labels.roles.groups[group]}
            </h3>
            <ul className="grid gap-2">
              {roles.map((role) => (
                <li
                  key={role}
                  className="grid grid-cols-style-role items-center gap-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm">{labels.roles.names[role]}</p>
                    <ReadabilityBadge
                      issues={roleIssues(role)}
                      showReadable={readOn[role] !== undefined}
                    />
                  </div>
                  <ColorSelect
                    appStyle={style}
                    value={style.roles[role]}
                    mode={mode}
                    label={labels.roles.names[role]}
                    onChange={(id) =>
                      change((current) => ({
                        ...current,
                        roles: { ...current.roles, [role]: id },
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
