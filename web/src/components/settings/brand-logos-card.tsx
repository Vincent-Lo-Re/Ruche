import { BrandFileSlot } from "@/components/settings/brand-file-slot"
import { Card, CardContent } from "@/components/ui/card"
import { identityWords, type IdentityTarget } from "@/lib/admin-identity"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files

/**
 * Les logos (Paramètres, section « Logos » ; App mobile › Identité pour ceux de l'app) : une
 * carte, le logotype puis le monogramme, chacun avec ses deux cases (fond clair, fond sombre) et
 * son usage ; côte à côte sur une carte assez large, l'un sous l'autre sinon.
 */
export function BrandLogosCard({ target }: { target: IdentityTarget }) {
  const { uses } = identityWords(target).logos
  return (
    <Card className="@container">
      <CardContent className="grid gap-6 @md:grid-cols-2">
        {(["logotype", "monogram"] as const).map((kind) => (
          <div key={kind} className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">{labels[kind].title}</span>
              <span className="text-muted-foreground"> · {uses[kind]}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BrandFileSlot target={target} kind={kind} surface="light" />
              <BrandFileSlot target={target} kind={kind} surface="dark" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
