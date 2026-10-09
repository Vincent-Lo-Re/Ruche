import { Palette } from "lucide-react"
import { useState } from "react"

import { PaletteChoice } from "@/components/theme/palette-choice"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { texts } from "@/texts"

/**
 * Les palettes depuis le header, en dernier : une icône qui ouvre une glissière à droite avec le
 * titre et la phrase de la carte Thème de Mon compte, puis toutes les palettes (PaletteChoice,
 * le même choix, gardé sur ce navigateur).
 */
export function PaletteSheet() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={texts.theme.openPalettes}
        onClick={() => setOpen(true)}
      >
        <Palette />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="pr-12">
            <SheetTitle>{texts.theme.title}</SheetTitle>
            <SheetDescription>{texts.theme.description}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <PaletteChoice />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
