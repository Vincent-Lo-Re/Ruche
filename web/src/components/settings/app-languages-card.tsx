import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronsUpDown, Ellipsis, Plus, Star, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TrashDialog } from "@/components/trash-dialog"
import { LoadState } from "@/components/load-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import {
  addAppLanguage,
  appLanguagesKey,
  COMMON_LANGUAGES,
  languageName,
  nativeLanguageName,
  removeAppLanguage,
  setAppLanguageEnabled,
  setDefaultAppLanguage,
  type AppLanguage,
} from "@/lib/app-languages"
import { appLanguagesRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.settings.languages

/** « Anglais · English » : le nom dans la langue de l'admin, puis dans la sienne s'il diffère. */
function LanguageLabel({ code }: { code: string }) {
  const name = languageName(code)
  const native = nativeLanguageName(code)
  return (
    <span>
      {name}
      {native !== name && (
        <span className="text-muted-foreground"> · {native}</span>
      )}
    </span>
  )
}

/**
 * Les langues de l'app (Paramètres › Langues, admins ; ADMIN § 7 bis) : la liste au centre (la
 * langue par défaut d'abord, avec sa pastille seule ; pour les autres, un interrupteur pour les
 * proposer dans l'app et un menu « … » pour les choisir par défaut ou les retirer), l'ajout dans une colonne à
 * droite, comme les Formules.
 */
export function AppLanguagesCard() {
  const queryClient = useQueryClient()
  const languages = useQuery(appLanguagesRead())
  const [toRemove, setToRemove] = useState<string | null>(null)
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: appLanguagesKey })
  const onError = () => toast.error(texts.common.unexpected)

  const toggle = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) =>
      setAppLanguageEnabled(code, enabled),
    onError,
    onSettled: refresh,
  })
  const makeDefault = useMutation({
    mutationFn: (code: string) => setDefaultAppLanguage(code),
    onSuccess: (_, code) =>
      toast.success(labels.defaultChanged(languageName(code))),
    onError,
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: (code: string) => removeAppLanguage(code),
    onSuccess: (_, code) => toast.success(labels.removed(languageName(code))),
    onError,
    onSettled: async () => {
      setToRemove(null)
      await refresh()
    },
  })
  const busy = toggle.isPending || makeDefault.isPending || remove.isPending

  return (
    <div className="grid items-start gap-6 lg:grid-cols-list-aside">
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {languages.data === undefined ? (
            <LoadState
              query={languages}
              failed={labels.loadFailed}
              rows={2}
              rowClassName="h-11 w-full"
            />
          ) : (
            <Table>
              <TableBody>
                {languages.data.map((one) => (
                  <LanguageRow
                    key={one.code}
                    language={one}
                    disabled={busy}
                    onToggle={(enabled) =>
                      toggle.mutate({ code: one.code, enabled })
                    }
                    onMakeDefault={() => makeDefault.mutate(one.code)}
                    onRemove={() => setToRemove(one.code)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <AddLanguage
        existing={languages.data?.map((one) => one.code) ?? []}
        onAdded={refresh}
      />

      <TrashDialog
        open={toRemove !== null}
        title={labels.confirmRemove.title}
        description={
          toRemove
            ? labels.confirmRemove.description(languageName(toRemove))
            : ""
        }
        confirmLabel={labels.confirmRemove.confirm}
        pending={remove.isPending}
        onConfirm={() => toRemove && remove.mutate(toRemove)}
        onCancel={() => setToRemove(null)}
      />
    </div>
  )
}

function LanguageRow({
  language: { code, is_default, enabled },
  disabled,
  onToggle,
  onMakeDefault,
  onRemove,
}: {
  language: AppLanguage
  disabled: boolean
  onToggle: (enabled: boolean) => void
  onMakeDefault: () => void
  onRemove: () => void
}) {
  const name = languageName(code)
  return (
    <TableRow>
      <TableCell className="font-medium">
        <LanguageLabel code={code} />
      </TableCell>
      <TableCell className="w-28">
        {is_default && <Badge variant="secondary">{labels.default}</Badge>}
      </TableCell>
      {/* La langue par défaut est toujours proposée, et ne se retire pas : sa pastille suffit. */}
      <TableCell className="w-14">
        {!is_default && (
          <Switch
            checked={enabled}
            disabled={disabled}
            aria-label={labels.offered(name)}
            onCheckedChange={onToggle}
          />
        )}
      </TableCell>
      <TableCell className="w-12 text-right">
        {!is_default && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={labels.actions(name)}
                  disabled={disabled}
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onMakeDefault}>
                <Star />
                {labels.makeDefault}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <Trash2 />
                {labels.remove}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}

function AddLanguage({
  existing,
  onAdded,
}: {
  existing: readonly string[]
  onAdded: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const choices = COMMON_LANGUAGES.filter((one) => !existing.includes(one))
  const add = useMutation({
    mutationFn: (chosen: string) => addAppLanguage(chosen),
    onSuccess: async (_, chosen) => {
      toast.success(labels.added(languageName(chosen)))
      setCode(null)
      await onAdded()
    },
    onError: () => toast.error(texts.common.unexpected),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.addTitle}</CardTitle>
        <CardDescription>{labels.addDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field>
          <FieldLabel htmlFor="app-language-pick">{labels.pick}</FieldLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button
                  id="app-language-pick"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={add.isPending}
                  className="w-full justify-between font-normal"
                />
              }
            >
              {code ? <LanguageLabel code={code} /> : labels.search}
              <ChevronsUpDown className="text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-(--anchor-width) p-0">
              <Command>
                <CommandInput placeholder={labels.search} autoFocus />
                <CommandList className="max-h-64">
                  <CommandEmpty>{labels.noMatch}</CommandEmpty>
                  {choices.map((one) => (
                    <CommandItem
                      key={one}
                      value={one}
                      keywords={[languageName(one), nativeLanguageName(one)]}
                      onSelect={() => {
                        setCode(one)
                        setOpen(false)
                      }}
                    >
                      <LanguageLabel code={one} />
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </Field>
        <Button
          className="w-full"
          disabled={code === null || add.isPending}
          onClick={() => code && add.mutate(code)}
        >
          {add.isPending ? <Spinner /> : <Plus />}
          {labels.add}
        </Button>
      </CardContent>
    </Card>
  )
}
