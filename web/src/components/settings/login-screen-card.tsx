import { cn } from "cn"
import { ImagePlus, UploadCloud } from "lucide-react"
import { useId, useState } from "react"

import { AnimatedMonogram } from "@/components/auth/animated-monogram"
import { InfoTip } from "@/components/info-tip"
import { HiddenFileInput, RemoveFileButton } from "@/components/file-input"
import { PhoneFrame } from "@/components/phone-frame"
import { ThemeToggleGroup } from "@/components/theme-choice"
import { themeOptions } from "@/components/theme/theme-options"
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
import { useBrandMutation, useIdentity } from "@/hooks/use-brand-name"
import {
  BrandFileError,
  identityWords,
  prepareScreenImage,
  removeScreenImage,
  saveMonogramMotion,
  saveMonogramMotions,
  saveScreenImage,
  screenImageAccept,
  type BrandSurface,
  type IdentityTarget,
} from "@/lib/admin-identity"
import {
  DEFAULT_MOTIONS,
  type Motion,
  motionBlocker,
  MOTIONS,
} from "@/lib/monogram-motion"
import { texts } from "@/texts"

const files = texts.settings.adminIdentity.files
const motionLabels = files.monogramMotion
const phoneThemeLabel = texts.appPages.identity.loadingScreen.theme
// Le thème du téléphone de l'aperçu de l'app : clair ou sombre (pas « Automatique »).
const phoneThemes = themeOptions.filter(
  (option): option is Extract<typeof option, { value: BrandSurface }> =>
    option.value !== "system"
)

/**
 * L'écran de connexion (Paramètres, section « Écran de connexion ») : une carte, l'aperçu tel que
 * sur la connexion (l'image envoyée sous le voile du fond du menu, et le monogramme, animé ou
 * immobile), qui marche comme une case des logos (FileSlot) : un clic choisit ou remplace
 * l'image, on peut aussi l'y déposer, l'icône d'image prend son « + » au survol, et la gomme qui
 * la retire apparaît dans le coin ; sans image, le fond sombre seul, sous le monogramme. À côté
 * (dessous sur une carte étroite), l'image de fond (son titre et ses formats, sans bouton) et le
 * monogramme animé (son interrupteur, puis ses animations à cocher). Les mêmes pour toute
 * l'équipe.
 *
 * Pour l'app (`target="app"`, App mobile › Identité), l'écran de chargement : le même, mais son
 * aperçu est dans un téléphone (PhoneFrame), clair ou sombre au choix ; sans image, le fond uni du
 * téléphone, et le monogramme pour ce fond (ADMIN § 1).
 */
export function LoginScreenCard({ target }: { target: IdentityTarget }) {
  const inputId = useId()
  const brand = useIdentity(target)
  const words = identityWords(target).screen
  // Le fond de l'écran : sombre pour la connexion de l'admin, celui du téléphone pour l'app.
  const [phoneTheme, setPhoneTheme] = useState<BrandSurface>("light")
  const surface: BrandSurface = target === "app" ? phoneTheme : "dark"
  const monogram = useMonogramSvg(target, surface)
  const image = brand?.screenImage ?? null

  const save = useBrandMutation({
    mutationFn: async (chosen: File) =>
      saveScreenImage(
        target,
        await prepareScreenImage(chosen),
        image?.path ?? null
      ),
    saved: files.saved,
    errorText: (error) =>
      error instanceof BrandFileError ? error.message : texts.common.unexpected,
    target,
  })
  const remove = useBrandMutation({
    mutationFn: (path: string) => removeScreenImage(target, path),
    saved: files.removed,
    target,
  })
  const motion = useBrandMutation({
    mutationFn: (next: boolean) => saveMonogramMotion(target, next),
    saved: (next) =>
      next ? files.monogramMotion.on : files.monogramMotion.off,
    target,
  })
  const chosenMotions = useBrandMutation({
    mutationFn: (next: Motion[]) => saveMonogramMotions(target, next),
    saved: motionLabels.saved,
    target,
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
  // L'image sous son voile (sinon le fond seul), et le monogramme par-dessus.
  const scene = (
    <>
      {image && (
        <>
          <img
            src={image.url}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div
            aria-hidden
            className={cn(
              "absolute inset-0",
              target === "admin" ? "bg-card/70" : "blocks-loading-veil"
            )}
          />
        </>
      )}
      <div className={cn("relative", target === "admin" && "text-foreground")}>
        {/* Rallumé, ou ses animations changées, il repart du début. */}
        <AnimatedMonogram
          key={animated ? motions.join() : "still"}
          motions={animated ? motions : []}
          target={target}
          surface={surface}
          className={target === "admin" ? "h-24 text-7xl" : "h-32 text-8xl"}
        />
      </div>
    </>
  )
  // Tel que sur l'écran, le monogramme par-dessus ; au survol, il pâlit et le « + » apparaît.
  const preview =
    target === "admin" ? (
      <div
        role="img"
        aria-label={words.preview}
        className="absolute inset-0 flex items-center justify-center transition-opacity group-hover/preview:opacity-30"
      >
        {scene}
      </div>
    ) : (
      <PhoneFrame
        role="img"
        label={words.preview}
        device="ios"
        theme={phoneTheme}
        className="blocks-device-small transition-opacity group-hover/preview:opacity-30"
        backdrop={
          <div className="absolute inset-0 flex items-center justify-center">
            {scene}
          </div>
        }
      />
    )

  return (
    <Card className="@container overflow-hidden py-0">
      <div className="flex flex-col @lg:flex-row">
        {/* L'aperçu (un clic choisit l'image) et la gomme, à côté de lui : un bouton ne va ni
            dans une étiquette de champ, ni dans une image (role="img"). */}
        <div
          className="group/preview relative flex flex-col @lg:flex-1"
          {...drop.handlers}
        >
          {/* Admin : sous la classe dark, le voile prend le fond du menu, comme sur l'écran de
              connexion. App : le téléphone, en petit, sur le fond gris de la carte. */}
          <label
            htmlFor={inputId}
            className={cn(
              "relative flex cursor-pointer items-center justify-center text-muted-foreground @lg:flex-1",
              target === "admin"
                ? "dark aspect-video bg-card @lg:aspect-auto @lg:min-h-56"
                : "bg-muted py-6",
              drop.dragging && "ring-2 ring-primary ring-inset"
            )}
          >
            <span className="sr-only">
              {image ? files.replace : files.loginImage.choose}
            </span>
            {/* L'aperçu de l'admin laisse la place à l'envoi ; le téléphone reste, l'envoi
                par-dessus. */}
            {(target === "app" || !(busy || drop.dragging)) && preview}
            {busy ? (
              <Spinner className="absolute size-8" />
            ) : drop.dragging ? (
              <UploadCloud aria-hidden className="absolute size-8" />
            ) : (
              <ImagePlus
                aria-hidden
                className="absolute size-8 text-foreground opacity-0 transition-opacity group-hover/preview:opacity-100"
              />
            )}
          </label>
          <HiddenFileInput
            id={inputId}
            accept={screenImageAccept}
            aria-label={words.title}
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
          {target === "app" && (
            <Item size="sm">
              <ItemContent>
                <ItemTitle>{phoneThemeLabel}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <ThemeToggleGroup
                  label={phoneThemeLabel}
                  options={phoneThemes}
                  value={phoneTheme}
                  onChange={setPhoneTheme}
                />
              </ItemActions>
            </Item>
          )}
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
