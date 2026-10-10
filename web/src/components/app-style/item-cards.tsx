import { ChevronDown, Plus } from "lucide-react"
import { useState, type ReactNode } from "react"

import {
  ColorSelect,
  NameInput,
  ReadabilityBadge,
} from "@/components/app-style/style-fields"
import {
  SortableEntries,
  SortableEntry,
} from "@/components/app-style/sortable-entry"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "cn"
import type { ReadabilityIssue } from "@/lib/app-style/problems"
import {
  badgeParts,
  buttonKinds,
  buttonParts,
  freeName,
  MAX_ITEMS,
  newBadge,
  newButton,
  newTint,
  tintParts,
  type AppStyle,
  type ButtonKind,
  type StyleButton,
  type StyleMode,
} from "@/lib/app-style/style"
import { texts } from "@/texts"

const labels = texts.appStyle

type Change = (update: (style: AppStyle) => AppStyle) => void
type Named = { id: string; name: string }
type ListKey = "tints" | "badges" | "buttons"

/** Le contenu commun d'une carte de liste : les éléments rangés, puis « Ajouter… ». */
function ItemsCard<T extends Named>({
  appStyle: style,
  list,
  items,
  addLabel,
  minOne,
  onAdd,
  change,
  children,
}: {
  appStyle: AppStyle
  list: ListKey
  items: readonly T[]
  addLabel: string
  minOne: string
  onAdd: () => void
  change: Change
  children: (item: T, position: number) => ReactNode
}) {
  return (
    <Card className="pb-0">
      <CardContent>
        <SortableEntries
          items={items}
          onReorder={(next) =>
            change((current) => ({ ...current, [list]: next }))
          }
        >
          {(item, position) => (
            <SortableEntry
              key={item.id}
              item={item}
              removeBlocked={items.length === 1 ? minOne : null}
              onRemove={() =>
                change((current) => ({
                  ...current,
                  [list]: (current[list] as readonly Named[]).filter(
                    (other) => other.id !== item.id
                  ),
                }))
              }
            >
              {children(item, position)}
            </SortableEntry>
          )}
        </SortableEntries>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          disabled={style[list].length >= MAX_ITEMS}
          onClick={onAdd}
        >
          <Plus aria-hidden />
          {addLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}

/** Remplace un élément d'une liste. */
function updated<T extends Named>(
  items: readonly T[],
  id: string,
  patch: Partial<T>
) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

/** Les couleurs d'un élément : un choix dans la palette pour chacune de ses parties. */
function PartSelects<T extends Named>({
  appStyle: style,
  item,
  parts,
  partLabels,
  mode,
  onChange,
}: {
  appStyle: AppStyle
  item: T
  parts: readonly (keyof T & string)[]
  partLabels: Record<string, string>
  mode: StyleMode
  onChange: (part: keyof T & string, id: string) => void
}) {
  return (
    <div className="mt-2 grid gap-2 grid-cols-style-parts">
      {parts.map((part) => (
        <div key={part} className="min-w-0 space-y-1">
          <Label className="text-xs text-muted-foreground">
            {partLabels[part]}
          </Label>
          <ColorSelect
            appStyle={style}
            value={String(item[part])}
            mode={mode}
            label={labels.partOf(item.name, partLabels[part])}
            onChange={(id) => onChange(part, id)}
          />
        </div>
      ))}
    </div>
  )
}

/** Les teintes des encadrés. */
export function TintsCard({
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
  const words = labels.tints
  return (
    <ItemsCard
      appStyle={style}
      list="tints"
      items={style.tints}
      addLabel={words.add}
      minOne={words.minOne}
      change={change}
      onAdd={() =>
        change((current) => ({
          ...current,
          tints: [
            ...current.tints,
            newTint(current, freeName(words.newName, current.tints)),
          ],
        }))
      }
    >
      {(tint) => (
        <>
          <div className="flex flex-wrap items-start gap-2">
            <NameInput
              value={tint.name}
              label={labels.colors.name}
              others={style.tints.filter((other) => other.id !== tint.id)}
              onChange={(name) =>
                change((current) => ({
                  ...current,
                  tints: updated(current.tints, tint.id, { name }),
                }))
              }
            />
            <ReadabilityBadge
              issues={issues.filter(
                (issue) => issue.kind === "tint" && issue.id === tint.id
              )}
            />
          </div>
          <PartSelects
            appStyle={style}
            item={tint}
            parts={tintParts}
            partLabels={words.parts}
            mode={mode}
            onChange={(part, id) =>
              change((current) => ({
                ...current,
                tints: updated(current.tints, tint.id, { [part]: id }),
              }))
            }
          />
        </>
      )}
    </ItemsCard>
  )
}

/** Les pastilles ; la première sert aux catégories. */
export function BadgesCard({
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
  const words = labels.badges
  return (
    <ItemsCard
      appStyle={style}
      list="badges"
      items={style.badges}
      addLabel={words.add}
      minOne={words.minOne}
      change={change}
      onAdd={() =>
        change((current) => ({
          ...current,
          badges: [
            ...current.badges,
            newBadge(current, freeName(words.newName, current.badges)),
          ],
        }))
      }
    >
      {(badge, position) => (
        <>
          <div className="flex flex-wrap items-start gap-2">
            <NameInput
              value={badge.name}
              label={labels.colors.name}
              others={style.badges.filter((other) => other.id !== badge.id)}
              onChange={(name) =>
                change((current) => ({
                  ...current,
                  badges: updated(current.badges, badge.id, { name }),
                }))
              }
            />
            {position === 0 && <Badge variant="secondary">{words.first}</Badge>}
            <ReadabilityBadge
              issues={issues.filter(
                (issue) => issue.kind === "badge" && issue.id === badge.id
              )}
            />
          </div>
          <PartSelects
            appStyle={style}
            item={badge}
            parts={badgeParts}
            partLabels={words.parts}
            mode={mode}
            onChange={(part, id) =>
              change((current) => ({
                ...current,
                badges: updated(current.badges, badge.id, { [part]: id }),
              }))
            }
          />
        </>
      )}
    </ItemsCard>
  )
}

const shapes = [
  "rounded",
  "pill",
  "square",
] as const satisfies readonly StyleButton["shape"][]

/** Les boutons : chacun son style, sa forme et ses couleurs ; le premier sert à l'app. */
export function ButtonsCard({
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
  const words = labels.buttons
  // Un bouton à la fois est ouvert (style, forme, couleurs) ; les autres tiennent sur une ligne.
  const [open, setOpen] = useState<string | null>(null)
  const update = (id: string, patch: Partial<StyleButton>) =>
    change((current) => ({
      ...current,
      buttons: updated(current.buttons, id, patch),
    }))
  return (
    <ItemsCard
      appStyle={style}
      list="buttons"
      items={style.buttons}
      addLabel={words.add}
      minOne={words.minOne}
      change={change}
      onAdd={() => {
        const added = newButton(style, freeName(words.newName, style.buttons))
        change((current) => ({
          ...current,
          buttons: [...current.buttons, added],
        }))
        setOpen(added.id)
      }}
    >
      {(button, position) => {
        // Dans un dégradé, le fond s'appelle « Début ».
        const partLabels = {
          ...words.parts,
          fill:
            button.kind === "gradient" ? words.parts.start : words.parts.fill,
        }
        const shapeItems = shapes.map((shape) => ({
          value: shape,
          label: words.shapes[shape],
        }))
        return (
          <>
            <div className="flex flex-wrap items-start gap-2">
              <NameInput
                value={button.name}
                label={labels.colors.name}
                others={style.buttons.filter((other) => other.id !== button.id)}
                onChange={(name) => update(button.id, { name })}
              />
              {position === 0 && (
                <Badge variant="secondary">{words.first}</Badge>
              )}
              <ReadabilityBadge
                issues={issues.filter(
                  (issue) => issue.kind === "button" && issue.id === button.id
                )}
              />
              {open !== button.id && (
                <span className="flex h-10 items-center text-sm text-muted-foreground">
                  {words.kinds[button.kind]}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={words.details(button.name)}
                aria-expanded={open === button.id}
                aria-controls={`button-${button.id}`}
                onClick={() =>
                  setOpen((shown) => (shown === button.id ? null : button.id))
                }
              >
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "transition-transform motion-reduce:transition-none",
                    open === button.id && "rotate-180"
                  )}
                />
              </Button>
            </div>
            {open === button.id && (
              <div id={`button-${button.id}`}>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ToggleGroup
                    variant="outline"
                    size="sm"
                    aria-label={words.kind}
                    value={[button.kind]}
                    onValueChange={(value: string[]) => {
                      const kind = buttonKinds.find((k) => k === value[0])
                      if (kind) update(button.id, { kind: kind as ButtonKind })
                    }}
                  >
                    {buttonKinds.map((kind) => (
                      <ToggleGroupItem key={kind} value={kind}>
                        {words.kinds[kind]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <Select
                    items={shapeItems}
                    value={button.shape}
                    onValueChange={(value) => {
                      const shape = shapes.find((s) => s === value)
                      if (shape) update(button.id, { shape })
                    }}
                  >
                    <SelectTrigger aria-label={words.shape}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shapeItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <PartSelects
                  appStyle={style}
                  item={button}
                  parts={buttonParts[button.kind]}
                  partLabels={partLabels}
                  mode={mode}
                  onChange={(part, id) => update(button.id, { [part]: id })}
                />
              </div>
            )}
          </>
        )
      }}
    </ItemsCard>
  )
}
