import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type LanguageItem = { value: string; label: string }

/**
 * La liste de choix d'une langue, sur toute la largeur : celle du membre (Mon compte) et celle de
 * toute l'admin (Paramètres › Avancé).
 */
export function LanguageSelect({
  id,
  items,
  value,
  disabled,
  onValueChange,
}: {
  id: string
  items: LanguageItem[]
  value: string
  disabled: boolean
  onValueChange: (value: string) => void
}) {
  return (
    <Select
      items={items}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next)
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
