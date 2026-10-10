import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import {
  categoryKeys,
  createCategory,
  type Category,
  type CategorySection,
} from "@/lib/categories"
import { normalizeSearch } from "@/lib/contents/list-filters"
import { errorMessage } from "@/lib/errors"
import { categoryNameSchema } from "@/lib/schemas"
import { sameNameKey } from "@/lib/titles"
import { texts } from "@/texts"

const words = texts.categories.picker

// Une catégorie de la liste, ou « Créer « … » » quand rien ne porte ce nom.
type Option = { id: string; name: string; create?: true }

const CREATE = "nouvelle"

/**
 * Les catégories d'un contenu (10/10/2026) : seules les choisies s'affichent, en pastilles qu'un ×
 * retire ; les autres se trouvent en tapant (sans les accents ni les majuscules), dans l'ordre
 * de la section. Un nom qu'aucune ne porte se crée sur place (comme depuis la page
 * Catégories), puis se choisit. La même hauteur avec 3 catégories comme avec 80. Une catégorie
 * supprimée entre-temps n'est plus montrée, et part de la liste au prochain changement ([D28]).
 */
export function CategoryPicker({
  section,
  list,
  chosen,
  editable,
  labelledBy,
  onChange,
}: {
  section: CategorySection
  list: Category[]
  chosen: string[]
  editable: boolean
  // L'identifiant du titre qui nomme le champ.
  labelledBy: string
  onChange: (categoryIds: string[]) => void
}) {
  const queryClient = useQueryClient()
  const anchor = useComboboxAnchor()
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const known = list.map((category) => ({
    id: category.id,
    name: category.name,
  }))
  const value = known.filter((option) => chosen.includes(option.id))
  const wanted = query.trim()
  // Un nom déjà porté (majuscules et espaces ignorés, comme la base) : pas de « Créer ».
  const exists = known.some(
    (option) => sameNameKey(option.name) === sameNameKey(wanted)
  )
  const options: Option[] =
    editable && wanted !== "" && !exists
      ? [...known, { id: CREATE, name: wanted, create: true }]
      : known

  const add = useMutation({
    mutationFn: (name: string) => createCategory(section, name),
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(
        categoryKeys.list(section),
        (old) => [...(old ?? []), category]
      )
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      setQuery("")
      onChange([...chosen, category.id].sort())
    },
    onError: (failure) => setError(errorMessage(failure)),
  })

  const choose = (next: Option[]) => {
    setError(null)
    const created = next.find((option) => option.create)
    if (created) {
      const parsed = categoryNameSchema.safeParse({ name: created.name })
      if (parsed.success) add.mutate(parsed.data.name)
      else setError(parsed.error.issues[0]?.message ?? null)
      return
    }
    onChange(next.map((option) => option.id).sort())
  }

  return (
    <div className="space-y-1.5">
      <Combobox
        multiple
        autoHighlight
        items={options}
        value={value}
        onValueChange={choose}
        inputValue={query}
        onInputValueChange={setQuery}
        itemToStringLabel={(option: Option) => option.name}
        isItemEqualToValue={(item: Option, other: Option) =>
          item.id === other.id
        }
        filter={(option: Option, typed: string) =>
          option.create === true ||
          normalizeSearch(option.name).includes(normalizeSearch(typed))
        }
        disabled={!editable || add.isPending}
      >
        <ComboboxChips ref={anchor} data-category-choice>
          <ComboboxValue>
            {(chips: Option[]) => (
              <>
                {chips.map((option) => (
                  <ComboboxChip
                    key={option.id}
                    showRemove={editable}
                    removeLabel={words.remove(option.name)}
                  >
                    {option.name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  aria-labelledby={labelledBy}
                  placeholder={editable ? words.placeholder : undefined}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>{words.empty}</ComboboxEmpty>
          <ComboboxList>
            {(option: Option) => (
              <ComboboxItem key={option.id} value={option}>
                {option.create ? (
                  <>
                    <Plus aria-hidden />
                    {words.create(option.name)}
                  </>
                ) : (
                  option.name
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
