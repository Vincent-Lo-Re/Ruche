import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ListItem = { value: string; label: string }

/**
 * Une liste de choix sur toute la largeur : la langue et le format régional, du membre (Mon
 * compte) et de toute l'admin (Paramètres › Avancé), « Aller à la section » de la charte de l'app.
 * Son nom vient de son libellé (id), ou de label.
 */
export function ListSelect({
  id,
  label,
  items,
  value,
  disabled = false,
  onValueChange,
}: {
  id: string
  label?: string
  items: ListItem[]
  value: string
  disabled?: boolean
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
      <SelectTrigger id={id} aria-label={label} className="w-full">
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
