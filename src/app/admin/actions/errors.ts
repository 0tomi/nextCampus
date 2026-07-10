import { z } from 'zod'

// Error de validación de negocio: su mensaje ya está redactado para mostrarse
// al usuario tal cual (vocabulario amistoso, sin tecnicismos).
export class ActionInputError extends Error {}

// Traduce cualquier error atrapado en una server action al shape
// { ok, message } que consumen los formularios con useActionState. Preserva el
// mensaje amigable del primer issue de Zod y el de ActionInputError; para lo
// inesperado usa el texto de respaldo, sin filtrar detalles técnicos.
export function actionError(err: unknown, fallback: string): { ok: false; message: string } {
  if (err instanceof z.ZodError) {
    return { ok: false, message: err.issues[0]?.message ?? fallback }
  }
  if (err instanceof ActionInputError) {
    return { ok: false, message: err.message }
  }
  return { ok: false, message: fallback }
}
