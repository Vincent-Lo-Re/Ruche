// Les choix gardés sur ce navigateur (langue, format, fuseau, noms des sections, thème,
// palette, vue de la Médiathèque) : lus et écrits sans jamais échouer. Un stockage indisponible
// (navigation privée…) vaut un choix absent, et un choix non gardé vaut pour cette visite.

/** Le texte gardé sous cette clé ; null si rien, ou si le stockage est indisponible. */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Garde ce texte sous cette clé (null : l'efface). Faux si le stockage est indisponible. */
export function writeStored(key: string, value: string | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Un choix du membre (Mon compte) qui passe avant celui de toute l'admin (Paramètres), sinon la
 * valeur de départ : connu dès le chargement de la page, qui se recharge quand le choix qui
 * s'applique change (les textes et les formats lus au chargement suivent).
 */
export function memberAdminChoice<T extends string>({
  memberKey,
  adminKey,
  isValid,
  fallback,
}: {
  memberKey: string
  adminKey: string
  isValid: (value: unknown) => value is T
  fallback: T
}) {
  const read = (key: string): T | null => {
    const stored = readStored(key)
    return isValid(stored) ? stored : null
  }
  const effective = () => read(memberKey) ?? read(adminKey) ?? fallback
  const current = effective()
  const reloadIfChanged = () => {
    if (effective() !== current)
      (globalThis as { location?: { reload(): void } }).location?.reload()
  }
  return {
    current,
    /** Le choix du membre (null : celui de l'admin), gardé sur ce navigateur. */
    applyMember(next: T | null) {
      writeStored(memberKey, next)
      reloadIfChanged()
    },
    /** Le choix de toute l'admin (null : la valeur de départ), gardé sur ce navigateur. */
    applyAdmin(next: T | null) {
      writeStored(adminKey, next)
      reloadIfChanged()
    },
  }
}
