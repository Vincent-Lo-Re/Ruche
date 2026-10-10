// Le fichier d'une charte : l'exporter, ou en importer un (vérifié comme la base le ferait). À
// part de api.ts : le validateur de la charte est gros, seule la page App le charge.

import { validateStyle } from "@/blocks/generated/style-validator"
import { styleProblems, type StyleProblem } from "@/lib/app-style/problems"
import type { AppStyle } from "@/lib/app-style/style"

/** Lit un fichier de charte exporté : la charte, ou ce qui ne va pas. */
export function parseStyleFile(
  text: string
): { style: AppStyle } | { problems: StyleProblem[] } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { problems: [{ rule: "shape", message: "json" }] }
  }
  if (!validateStyle(data)) {
    const first = validateStyle.errors?.[0]
    return {
      problems: [
        {
          rule: "shape",
          message:
            `${first?.instancePath ?? ""} ${first?.message ?? ""}`.trim(),
        },
      ],
    }
  }
  const problems = styleProblems(data)
  return problems.length > 0 ? { problems } : { style: data }
}

/** Le fichier d'une charte à exporter (JSON lisible). */
export function styleFile(style: AppStyle): Blob {
  return new Blob([`${JSON.stringify(style, null, 2)}\n`], {
    type: "application/json",
  })
}
