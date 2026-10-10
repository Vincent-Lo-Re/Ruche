import { useQuery } from "@tanstack/react-query"
import { ChevronsUpDown } from "lucide-react"
import { useMemo, useState } from "react"

import { LoadState } from "@/components/load-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useBrandMutation } from "@/hooks/use-brand-name"
import { saveAdminTimeZone } from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { timeZoneCity, timeZoneNames, timeZoneOffset } from "@/lib/time-zone"
import { texts } from "@/texts"

const labels = texts.settings.advanced.timeZone

/** « Paris (UTC+02:00) » : la ville et son décalage d'aujourd'hui. */
function zoneLabel(zone: string): string {
  return `${timeZoneCity(zone)} (${timeZoneOffset(zone)})`
}

/**
 * Le fuseau horaire de toute l'admin (onglet « Avancé » des Paramètres, admins) : les dates s'y
 * affichent et l'heure d'une publication programmée s'y comprend. Une liste où l'on cherche une
 * ville ou une région (Command dans un Popover, le « combobox » de shadcn). L'identité de l'admin
 * relue, useAdminSettings recharge la page si le fuseau change.
 */
export function AdminTimeZoneCard() {
  const brand = useQuery(adminBrandRead())
  const [open, setOpen] = useState(false)
  const save = useBrandMutation({
    mutationFn: (zone: string) => saveAdminTimeZone(zone),
    saved: labels.saved,
  })
  const current = save.isPending ? save.variables : brand.data?.timeZone
  const zones = useMemo(
    () => (current ? timeZoneNames(current) : []),
    [current]
  )

  return (
    <Card>
      <CardContent>
        {brand.isSuccess && current ? (
          <Field>
            <FieldLabel htmlFor="admin-time-zone">{labels.label}</FieldLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                render={
                  <Button
                    id="admin-time-zone"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={save.isPending}
                    className="w-full justify-between font-normal"
                  />
                }
              >
                {zoneLabel(current)}
                <ChevronsUpDown className="text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                className="w-(--anchor-width) p-0"
              >
                {/* La liste s'ouvre sur le fuseau choisi. */}
                <Command defaultValue={current}>
                  <CommandInput placeholder={labels.search} autoFocus />
                  <CommandList className="max-h-64">
                    <CommandEmpty>{labels.empty}</CommandEmpty>
                    {zones.map((zone) => (
                      <CommandItem
                        key={zone}
                        value={zone}
                        keywords={[timeZoneCity(zone)]}
                        data-checked={zone === current}
                        onSelect={() => {
                          setOpen(false)
                          if (zone !== current) save.mutate(zone)
                        }}
                      >
                        <span className="flex-1 truncate">
                          {timeZoneCity(zone)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {zone.split("/")[0]} · {timeZoneOffset(zone)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </Field>
        ) : (
          <LoadState query={brand} rows={1} failed={labels.loadFailed} />
        )}
      </CardContent>
    </Card>
  )
}
