import { zodResolver } from "@hookform/resolvers/zod"
import type { Factor } from "@supabase/supabase-js"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { profileQueryKey, useAuth, type Profile } from "@/auth/auth-context"
import { EmailChangeDialog } from "@/components/account/email-change-dialog"
import { ListSelect } from "@/components/list-select"
import { PageHeader } from "@/components/page-header"
import { RoleBadge } from "@/components/role-badge"
import { SettingsSection } from "@/components/settings/settings-section"
import { useBrand } from "@/hooks/use-brand-name"
import { PaletteChoice } from "@/components/theme/palette-choice"
import { PalettePreview } from "@/components/theme/palette-preview"
import { ThemeChoice } from "@/components/theme-choice"
import { FormField } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { saveFormat, saveFullName, saveLanguage } from "@/lib/auth"
import { formatDateTime, formatSample } from "@/lib/dates"
import {
  applyMemberLanguage,
  isLanguage,
  language,
  LANGUAGES,
  memberLanguage,
  type Language,
} from "@/lib/language"
import {
  applyMemberFormat,
  isRegionalFormat,
  languageFormat,
  memberFormat,
  REGIONAL_FORMATS,
  regionalFormatName,
  type RegionalFormat,
} from "@/lib/regional-format"
import { profileSchema } from "@/lib/schemas"
import { sections } from "@/navigation"
import { texts } from "@/texts"

/**
 * Mon compte : profil, double vérification et langue en sections (l'explication à gauche, la carte
 * à droite, comme Paramètres › Identité de l'admin), puis le thème (clair, sombre ou automatique,
 * et les couleurs) et son aperçu.
 */
export function AccountPage() {
  const { profile, factor } = useAuth()
  const { title, description } = texts.sections.account

  return (
    <>
      <PageHeader
        icon={sections.account.icon}
        title={title}
        description={description}
        actions={profile && <RoleBadge role={profile.role} large />}
      />
      <div className="@container space-y-8 pt-4">
        {profile && <ProfileCard profile={profile} />}
        <MfaCard factor={factor} />
        <LanguageCard />
        <FormatCard />
      </div>
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        <Section
          title={texts.theme.title}
          description={texts.theme.description}
          action={<ThemeChoice />}
        >
          <PaletteChoice />
        </Section>

        <Section
          title={texts.colors.preview.title}
          description={texts.colors.preview.description}
          // Collé à la marge du haut de la page (p-8 d'AppLayout) : en top-0, le trait du haut de
          // la carte, dessiné à l'extérieur, serait coupé par le bord du panneau qui défile.
          className="xl:sticky xl:top-8"
        >
          <PalettePreview />
        </Section>
      </div>
    </>
  )
}

function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

/**
 * La double vérification : la date dans une ligne grise avec le bouclier (Item, comme « Se
 * déconnecter ») ; ce qu'il faut faire si le téléphone est perdu, sous l'explication (seul un
 * admin la réinitialise).
 */
function MfaCard({ factor }: { factor: Factor | null }) {
  const labels = texts.account.mfa
  return (
    <SettingsSection
      title={labels.title}
      description={labels.description}
      extra={
        <p className="text-sm text-muted-foreground">
          <span className="block font-medium text-foreground">
            {labels.lostPhone.title}
          </span>
          {labels.lostPhone.text}
        </p>
      }
    >
      {/* La ligne grise remplit la carte, de la hauteur de l'explication à gauche. */}
      <Card>
        <CardContent className="flex flex-1 flex-col">
          {factor && (
            <Item variant="muted" className="flex-1 items-center py-4">
              <ItemMedia variant="icon" className="self-center!">
                <ShieldCheck className="size-8! text-status-live" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-status-live">
                  {labels.configured}
                </ItemTitle>
                <ItemDescription>
                  {labels.configuredOn(formatDateTime(factor.created_at))}
                </ItemDescription>
              </ItemContent>
            </Item>
          )}
        </CardContent>
      </Card>
    </SettingsSection>
  )
}

/**
 * Le profil, sur le modèle de la carte « Account Access » de shadcn : le nom, avec « Enregistrer »
 * collé au champ ; puis la connexion : l'adresse e-mail grisée, avec « Modifier » collé au champ,
 * qui ouvre le changement d'adresse (EmailChangeDialog).
 */
function ProfileCard({ profile }: { profile: Profile }) {
  const labels = texts.account.profile
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const [changingEmail, setChangingEmail] = useState(false)
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile.full_name ?? "" },
  })

  const save = useMutation({
    mutationFn: (fullName: string) => saveFullName(profile.id, fullName),
    onSuccess: async (_, fullName) => {
      form.reset({ full_name: fullName })
      await queryClient.invalidateQueries({
        queryKey: profileQueryKey(profile.id),
      })
      toast.success(labels.saved)
    },
    onError: () => toast.error(texts.common.unexpected),
  })

  const onSubmit = form.handleSubmit(({ full_name }) => save.mutate(full_name))

  return (
    <>
      <SettingsSection title={labels.title} description={labels.description}>
        <form onSubmit={onSubmit} noValidate>
          <Card>
            <CardContent>
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="full_name"
                  id="account-name"
                  label={labels.name}
                  render={(field, props) => (
                    <ButtonGroup className="w-full">
                      <Input
                        {...field}
                        {...props}
                        autoComplete="name"
                        placeholder={labels.namePlaceholder}
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={save.isPending || !form.formState.isDirty}
                      >
                        {save.isPending && <Spinner />}
                        {texts.common.save}
                      </Button>
                    </ButtonGroup>
                  )}
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </form>
      </SettingsSection>
      {/* L'adresse e-mail, où arrivent les codes de connexion. */}
      <SettingsSection
        title={texts.account.signIn.title}
        description={texts.account.signIn.description}
      >
        <Card>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="account-email">{labels.email}</FieldLabel>
              <ButtonGroup className="w-full">
                <Input
                  id="account-email"
                  type="email"
                  value={profile.email}
                  disabled
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChangingEmail(true)}
                >
                  {texts.account.emailChange.open}
                </Button>
              </ButtonGroup>
            </Field>
          </CardContent>
        </Card>
        <EmailChangeDialog
          open={changingEmail}
          onOpenChange={setChangingEmail}
          userId={profile.id}
          currentEmail={session?.user.email ?? profile.email}
        />
      </SettingsSection>
    </>
  )
}

// « Comme l'admin » : le membre suit la langue de toute l'admin (Paramètres › Avancé).
const ADMIN_CHOICE = "admin"

/**
 * La langue de l'admin pour ce membre (ou celle de toute l'admin) : rangée sur son compte, puis
 * la page se recharge si la langue change.
 */
function LanguageCard() {
  const labels = texts.account.language
  const { session } = useAuth()
  const brand = useBrand()
  const chosen = memberLanguage(session?.user.user_metadata)
  const save = useMutation({
    mutationFn: saveLanguage,
    onSuccess: (_, next) => applyMemberLanguage(next),
    onError: () => toast.error(labels.failed),
  })
  const items = [
    {
      value: ADMIN_CHOICE,
      label: labels.sameAsAdmin(texts.languages[brand?.language ?? "en"]),
    },
    ...LANGUAGES.map((value) => ({ value, label: texts.languages[value] })),
  ]
  const current: string = save.isPending
    ? (save.variables ?? ADMIN_CHOICE)
    : (chosen ?? ADMIN_CHOICE)

  return (
    <SettingsSection title={labels.title} description={labels.description}>
      <Card>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="account-language">{labels.label}</FieldLabel>
            <ListSelect
              id="account-language"
              items={items}
              value={current}
              disabled={save.isPending}
              onValueChange={(value) => {
                const next: Language | null = isLanguage(value) ? value : null
                if (next !== chosen) save.mutate(next)
              }}
            />
          </Field>
        </CardContent>
      </Card>
    </SettingsSection>
  )
}

/**
 * Le format régional de ce membre (ou celui de toute l'admin) : l'écriture des dates, des heures
 * et des nombres, rangée sur son compte, avec un exemple ; la page se recharge s'il change.
 */
function FormatCard() {
  const labels = texts.account.format
  const { session } = useAuth()
  const brand = useBrand()
  const chosen = memberFormat(session?.user.user_metadata)
  const save = useMutation({
    mutationFn: saveFormat,
    onSuccess: (_, next) => applyMemberFormat(next),
    onError: () => toast.error(labels.failed),
  })
  // Celui de toute l'admin, sinon celui de la langue du membre.
  const adminFormat = brand?.locale ?? languageFormat(language)
  const items = [
    {
      value: ADMIN_CHOICE,
      label: labels.sameAsAdmin(regionalFormatName(adminFormat)),
    },
    ...REGIONAL_FORMATS.map((value) => ({
      value,
      label: regionalFormatName(value),
    })),
  ]
  const current: RegionalFormat | null = save.isPending
    ? (save.variables ?? null)
    : chosen

  return (
    <SettingsSection title={labels.title} description={labels.description}>
      <Card>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="account-format">{labels.label}</FieldLabel>
            <ListSelect
              id="account-format"
              items={items}
              value={current ?? ADMIN_CHOICE}
              disabled={save.isPending}
              onValueChange={(value) => {
                const next = isRegionalFormat(value) ? value : null
                if (next !== chosen) save.mutate(next)
              }}
            />
            <FieldDescription>
              {texts.dates.sample(formatSample(current ?? adminFormat))}
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>
    </SettingsSection>
  )
}
