import { texts } from "@/texts"

/**
 * Le message d'une erreur attrapée, pour un message à l'écran : celui de l'erreur (déjà en
 * français quand elle vient de nos appels : MediaError, ContentError…), sinon « Erreur
 * inattendue ».
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : texts.common.unexpected
}

/** Vrai si ce code a son message dans ce tableau (texts.x.errors) : un code connu de l'admin. */
export function isErrorCode<C extends string>(
  messages: Record<C, string>,
  code: unknown
): code is C {
  return typeof code === "string" && Object.hasOwn(messages, code)
}

/**
 * Une erreur de la base ou d'une fonction serveur : son code, s'il est connu (null : inattendue),
 * et le message de ce code, ou « Erreur inattendue ».
 */
export class CodedError<C extends string> extends Error {
  readonly code: C | null

  constructor(name: string, messages: Record<C, string>, code: C | null) {
    super(code ? messages[code] : texts.common.unexpected)
    this.name = name
    this.code = code
  }
}
