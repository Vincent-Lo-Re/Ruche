import { cn } from "cn"
import { ImagePlus, UploadCloud } from "lucide-react"
import { useId } from "react"

import { AnimatedMonogram } from "@/components/auth/animated-monogram"
import { InfoTip } from "@/components/info-tip"
import { HiddenFileInput, RemoveFileButton } from "@/components/file-input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useFileDrop } from "@/hooks/use-file-drop"
import { useMonogramSvg } from "@/hooks/use-monogram-svg"
import { useBrand, useBrandMutation } from "@/hooks/use-brand-name"
import {
  BrandFileError,
  loginImageAccept,
  prepareLoginImage,
  removeLoginImage,
  saveLoginImage,
  saveMonogramMotion,
  saveMonogramMotions,
} from "@/lib/admin-identity"
import {
  DEFAULT_MOTIONS,
  type Motion,
  motionBlocker,
  MOTIONS,
} from "@/lib/monogram-motion"
import { texts } from "@/texts"

const files = texts.settings.adminIdentity.files
const labels = files.loginScreen
const motionLabels = files.monogramMotion

/**
 * L'écran de connexion (Paramètres, section « Écran de connexion ») : une carte, l'aperçu tel que
 * sur la connexion (l'image envoyée sous le voile du fond du menu, et le monogramme, animé ou
 * immobile), qui marche comme une case des logos (FileSlot) : un clic choisit ou remplace
 * l'image, on peut aussi l'y déposer, l'icône d'image prend son « + » au survol, et la gomme qui
 * la retire apparaît dans le coin ; sans image, le fond sombre seul, sous le monogramme. À côté
 * (dessous sur une carte étroite), l'image de fond (son titre et ses formats, sans bouton) et le
 * monogramme animé (son interrupteur, puis ses animations à cocher). Les mêmes pour toute
 * l'équipe.
 */
export function LoginScreenCard() {
  const inputId = useId()
  const brand = useBrand()
  const monogram = useMonogramSvg()
  const image = brand?.loginImage ?? null

  const save = useBrandMutation({
    mutationFn: async (chosen: File) =>
      saveLoginImage(await prepareLoginImage(chosen), image?.path ?? null),
    saved: files.saved,
    errorText: (error) =>
      error instanceof BrandFileError ? error.message : texts.common.unexpected,
  })
  const remove = useBrandMutation({
    mutationFn: (path: string) => removeLoginImage(path),
    saved: files.removed,
  })
  const motion = useBrandMutation({
    mutationFn: (next: boolean) => saveMonogramMotion(next),
    saved: (next) =>
      next ? files.monogramMotion.on : files.monogramMotion.off,
  })
  const chosenMotions = useBrandMutation({
    mutationFn: (next: Motion[]) => saveMonogramMotions(next),
    saved: motionLabels.saved,
  })
  const busy = save.isPending || remove.isPending
  // Pendant l'enregistrement, l'interrupteur et les cases montrent déjà le choix.
  const animated = motion.isPending
    ? motion.variables
    : (brand?.monogramMotion ?? false)
  const motions = chosenMotions.isPending
    ? chosenMotions.variables
    : (brand?.monogramMotions ?? DEFAULT_MOTIONS)
  const toggleMotion = (which: Motion, checked: boolean) =>
    chosenMotions.mutate(
      MOTIONS.filter((one) => (one === which ? checked : motions.includes(one)))
    )
  const drop = useFileDrop((dropped) => save.mutate(dropped), busy)

  return (
    <Card className="@container overflow-hidden py-0">
      <div className="flex flex-col @lg:flex-row">
        {/* L'aperçu (un clic choisit l'image) et la gomme, à côté de lui : un bouton ne va ni
            dans une étiquette de champ, ni dans une image (role="img"). */}
        <div
          className="group/preview relative flex flex-col @lg:flex-1"
          {...drop.handlers}
        >
          {/* Sous la classe dark : le voile prend le fond du menu, comme sur l'écran de connexion. */}
          <label
            htmlFor={inputId}
            className={cn(
              "dark relative flex aspect-video cursor-pointer items-center justify-center bg-card text-muted-foreground @lg:aspect-auto @lg:min-h-56 @lg:flex-1",
              drop.dragging && "ring-2 ring-primary ring-inset"
            )}
          >
            <span className="sr-only">
              {image ? files.replace : files.loginImage.choose}
            </span>
            {busy ? (
              <Spinner className="size-8" />
            ) : drop.dragging ? (
              <UploadCloud aria-hidden className="size-8" />
            ) : (
              <>
                {/* Tel que sur la connexion : l'image envoyée sous le voile, sinon le fond seul ;
                    le monogramme par-dessus. Au survol, il pâlit et le « + » apparaît. */}
                <div
                  role="img"
                  aria-label={labels.preview}
                  className="absolute inset-0 flex items-center justify-center transition-opacity group-hover/preview:opacity-30"
                >
                  {image && (
                    <>
                      <img
                        src={image.url}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-card/70"
                      />
                    </>
                  )}
                  <div className="relative text-foreground">
                    {/* Rallumé, ou ses animations changées, il repart du début. */}
                    <AnimatedMonogram
                      key={animated ? motions.join() : "still"}
                      motions={animated ? motions : []}
                      className="h-24 text-7xl"
                    />
                  </div>
                </div>
                <ImagePlus
                  aria-hidden
                  className="relative size-8 text-foreground opacity-0 transition-opacity group-hover/preview:opacity-100"
                />
              </>
            )}
          </label>
          <HiddenFileInput
            id={inputId}
            accept={loginImageAccept}
            aria-label={labels.title}
            disabled={busy}
            onFiles={(chosen) => {
              if (chosen?.[0]) save.mutate(chosen[0])
            }}
          />
          {image && !busy && (
            // Comme sur les logos : un fond plein sous le rouge pâle, visible sur toute image.
            <RemoveFileButton
              label={files.remove}
              onClick={() => remove.mutate(image.path)}
              className="shadow-sm ring-1 ring-foreground/10 group-hover/preview:opacity-100"
            />
          )}
        </div>
        <ItemGroup className="justify-center gap-0 divide-y p-2 @lg:w-80">
          <Item size="sm">
            <ItemContent>
              <ItemTitle>{files.loginImage.title}</ItemTitle>
              <ItemDescription className="line-clamp-none">
                {files.loginImage.formats}
              </ItemDescription>
            </ItemContent>
          </Item>
          <Item size="sm">
            <ItemContent>
              <ItemTitle>{files.monogramMotion.title}</ItemTitle>
              <ItemDescription className="line-clamp-none">
                {files.monogramMotion.description}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Switch
                checked={animated}
                onCheckedChange={(next) => motion.mutate(next)}
                disabled={motion.isPending}
                aria-label={files.monogramMotion.toggle}
              />
            </ItemActions>
            <div className="basis-full pt-1">
              <ul
                aria-label={motionLabels.group}
                className="grid grid-cols-2 gap-x-3 gap-y-2"
              >
                {MOTIONS.map((one) => {
                  // Sans monogramme, les initiales (du texte) : ni tracé, ni cascade, ni lueur.
                  // Tant que le fichier n'est pas lu, rien n'est grisé.
                  const blocked =
                    monogram.url === null
                      ? motionBlocker(one, null) && "text"
                      : monogram.svg.isSuccess
                        ? motionBlocker(one, monogram.svg.data)
                        : null
                  // Une animation impossible n'est jamais montrée cochée (elle ne se joue pas).
                  const checked = motions.includes(one) && blocked === null
                  return (
                    <li key={one} className="flex items-center gap-1">
                      <Label className="font-normal">
                        <Checkbox
                          checked={checked}
                          disabled={
                            !animated ||
                            blocked !== null ||
                            chosenMotions.isPending
                          }
                          onCheckedChange={(next) => toggleMotion(one, next)}
                        />
                        {motionLabels.motions[one]}
                      </Label>
                      {blocked && (
                        <InfoTip text={motionLabels.blocked[blocked]} />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </Item>
        </ItemGroup>
      </div>
    </Card>
  )
}
