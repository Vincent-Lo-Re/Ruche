import { BrandFileSlot } from "@/components/settings/brand-file-slot"
import { Card, CardContent } from "@/components/ui/card"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files

/**
 * Les logos (Paramètres, section « Logos ») : une carte, le logotype puis le monogramme, chacun
 * avec ses deux cases (fond clair, fond sombre) ; côte à côte sur une carte assez large, l'un sous
 * l'autre sinon.
 */
export function BrandLogosCard() {
  return (
    <Card className="@container">
      <CardContent className="grid gap-6 @md:grid-cols-2">
        {(["logotype", "monogram"] as const).map((kind) => (
          <div key={kind} className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">{labels[kind].title}</span>
              <span className="text-muted-foreground">
                {" "}
                · {labels[kind].use}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BrandFileSlot kind={kind} surface="light" />
              <BrandFileSlot kind={kind} surface="dark" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
