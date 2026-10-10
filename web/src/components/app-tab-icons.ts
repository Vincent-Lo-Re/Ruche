import {
  Compass,
  Fingerprint,
  LayoutTemplate,
  Palette,
  type LucideIcon,
} from "lucide-react"

import type { AppTab } from "@/lib/address"

/** L'icône de chaque onglet de la section « App ». */
export const appTabIcons: Record<AppTab, LucideIcon> = {
  identity: Fingerprint,
  style: Palette,
  navigation: Compass,
  layouts: LayoutTemplate,
}
