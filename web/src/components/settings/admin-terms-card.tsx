import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ListSelect } from "@/components/list-select"
import { LoadState } from "@/components/load-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  language as adminLanguage,
  LANGUAGES,
  type Language,
} from "@/lib/language"
import { termsRead } from "@/lib/reads"
import {
  TERM_KEYS,
  type Gender,
  type StoredTerm,
  type Term,
  type TermKey,
  type Traits,
} from "@/lib/term-forms"
import { saveTerms, termsKey } from "@/lib/terms"
import { texts } from "@/texts"
import { englishSample, englishTerm } from "@/texts/grammar/en"
import { frenchSample, frenchTerm } from "@/texts/grammar/fr"

const labels = texts.settings.advanced.terms

// Par langue de l'admin : le terme par défaut d'une section (son nom et ses traits) et la phrase
// qui montre ses accords.
const grammar: Record<
  Language,
  { term: (key: TermKey) => Term; sample: (term: Term) => string }
> = {
  fr: { term: frenchTerm, sample: frenchSample },
  en: { term: englishTerm, sample: englishSample },
}

// Le genre et l'élision ne se demandent qu'en français.
const hasGender = (of: Language) => of === "fr"

/** Les traits tels qu'ils partent : le genre affiché, pas d'élision au pluriel ni en anglais. */
function sentTraits(of: Language, traits: Traits): Traits {
  if (!hasGender(of)) return { plural: Boolean(traits.plural) }
  return {
    gender: traits.gender ?? "masculine",
    plural: Boolean(traits.plural),
    elided: Boolean(traits.elided) && !traits.plural,
  }
}

/**
 * Les termes de l'admin (Paramètres › Avancé, admins ; ADMIN § 7 bis) : un onglet par langue de
 * l'interface, la sienne d'abord ; dans chacun, une ligne par section (le Blog, les Podcasts) avec
 * le nom, le genre et l'élision en français, le nombre, et l'aperçu des accords ; un seul
 * « Enregistrer ». Relus par useTerms, qui recharge la page : tous les textes les prennent.
 */
export function AdminTermsCard() {
  const terms = useQuery(termsRead())
  const tabs = [...LANGUAGES].sort((a) => (a === adminLanguage ? -1 : 1))
  return (
    <Card className="pb-0">
      {terms.isSuccess ? (
        <Tabs defaultValue={tabs[0]}>
          <CardContent className="space-y-6">
            <TabsList aria-label={labels.languages}>
              {tabs.map((of) => (
                <TabsTrigger key={of} value={of}>
                  {texts.languages[of]}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardContent>
          {tabs.map((of) => (
            <TabsContent key={of} value={of} className="pt-4">
              <LanguageTerms language={of} stored={terms.data} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <CardContent className="pb-6">
          <LoadState query={terms} rows={2} failed={labels.loadFailed} />
        </CardContent>
      )}
    </Card>
  )
}

function LanguageTerms({
  language: of,
  stored,
}: {
  language: Language
  stored: readonly StoredTerm[]
}) {
  const queryClient = useQueryClient()
  // Ce qu'on tape : un nom vide garde le mot par défaut ; sans terme, les traits du mot par
  // défaut (« Podcasts » est au pluriel).
  const [drafts, setDrafts] = useState<Record<TermKey, Term>>(() => {
    const entries = TERM_KEYS.map((key): [TermKey, Term] => {
      const found = stored.find((t) => t.key === key && t.language === of)
      return [
        key,
        found
          ? { name: found.name, traits: found.traits }
          : { name: "", traits: grammar[of].term(key).traits },
      ]
    })
    return Object.fromEntries(entries) as Record<TermKey, Term>
  })
  const save = useMutation({
    mutationFn: () =>
      saveTerms(
        of,
        TERM_KEYS.filter((key) => drafts[key].name.trim()).map((key) => ({
          key,
          name: drafts[key].name.trim(),
          traits: sentTraits(of, drafts[key].traits),
        }))
      ),
    onSuccess: async () => {
      toast.success(labels.saved)
      await queryClient.invalidateQueries({ queryKey: termsKey })
    },
    onError: () => toast.error(texts.common.unexpected),
  })
  const update = (key: TermKey, change: Partial<Term>) =>
    setDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...change },
    }))

  return (
    <>
      <CardContent className="@container space-y-6">
        {TERM_KEYS.map((key) => (
          <TermFields
            key={key}
            termKey={key}
            language={of}
            draft={drafts[key]}
            disabled={save.isPending}
            onChange={(change) => update(key, change)}
          />
        ))}
      </CardContent>
      <CardFooter className="mt-6">
        <Button
          className="ml-auto"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? <Spinner /> : <Save />}
          {texts.common.save}
        </Button>
      </CardFooter>
    </>
  )
}

function TermFields({
  termKey,
  language: of,
  draft,
  disabled,
  onChange,
}: {
  termKey: TermKey
  language: Language
  draft: Term
  disabled: boolean
  onChange: (change: Partial<Term>) => void
}) {
  const id = `term-${of}-${termKey}`
  const fallback = grammar[of].term(termKey).name
  const traits = draft.traits
  const setTraits = (change: Partial<Traits>) =>
    onChange({ traits: { ...traits, ...change } })
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-medium">
        {labels.sections[termKey]}
      </legend>
      <div className="grid gap-3 @xl:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>{labels.name}</FieldLabel>
          <Input
            id={`${id}-name`}
            value={draft.name}
            placeholder={fallback}
            maxLength={40}
            disabled={disabled}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </Field>
        {hasGender(of) && (
          <Field>
            <FieldLabel htmlFor={`${id}-gender`}>{labels.gender}</FieldLabel>
            <ListSelect
              id={`${id}-gender`}
              items={(["masculine", "feminine"] as const).map((gender) => ({
                value: gender,
                label: labels.genders[gender],
              }))}
              value={traits.gender ?? "masculine"}
              disabled={disabled}
              onValueChange={(value) => setTraits({ gender: value as Gender })}
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor={`${id}-number`}>{labels.number}</FieldLabel>
          <ListSelect
            id={`${id}-number`}
            items={[
              { value: "singular", label: labels.singular },
              { value: "plural", label: labels.plural },
            ]}
            value={traits.plural ? "plural" : "singular"}
            disabled={disabled}
            onValueChange={(value) => setTraits({ plural: value === "plural" })}
          />
        </Field>
      </div>
      {hasGender(of) && (
        <Field orientation="horizontal">
          <Checkbox
            id={`${id}-elided`}
            checked={Boolean(traits.elided) && !traits.plural}
            disabled={disabled || Boolean(traits.plural)}
            onCheckedChange={(checked) => setTraits({ elided: checked })}
          />
          <FieldLabel htmlFor={`${id}-elided`}>{labels.elided}</FieldLabel>
        </Field>
      )}
      <FieldDescription>
        {labels.preview(
          grammar[of].sample({
            name: draft.name.trim() || fallback,
            traits: sentTraits(of, traits),
          })
        )}
      </FieldDescription>
    </fieldset>
  )
}
