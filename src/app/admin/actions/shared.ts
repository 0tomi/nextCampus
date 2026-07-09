import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { requireGeneralAdmin, requireAcademicManager, requireAnyAdmin } from '@/lib/auth'
import { queryTags } from '@/lib/queries'
import { hostnameLabel } from '@/lib/linkFavicon'

// updateTag (a diferencia de revalidateTag) invalida en el momento y da
// semántica read-your-own-writes: el propio request de la server action ya
// ve los datos frescos, en vez de servir una versión vieja mientras
// revalida en background. Next 16 solo permite llamarlo dentro de una
// Server Action, que es el único contexto desde el que se usa este wrapper.
export function revalidateTag(tag: string): void {
  updateTag(tag)
}

// Toda escritura: auth específico (general o por año) -> Zod -> sanitize.

export type AdminAuthScope = 'any' | 'academic' | 'general'

export async function requireAuth(scope: AdminAuthScope = 'any') {
  if (scope === 'general') return requireGeneralAdmin()
  if (scope === 'academic') return requireAcademicManager()
  return requireAnyAdmin()
}

export type SubjectRevalidationContext = {
  subjectSlug: string
  yearSlug: string
  commissionSlugs: readonly string[]
}

export function revalidateSubjectContent(ctx: SubjectRevalidationContext): void {
  revalidateTag(queryTags.subject(ctx.subjectSlug))
  revalidateTag(queryTags.year(ctx.yearSlug))
  revalidatePath(`/${ctx.yearSlug}`)
  revalidatePath(`/${ctx.yearSlug}/calendario`)
  revalidatePath(`/${ctx.yearSlug}/${ctx.subjectSlug}`)

  for (const commissionSlug of ctx.commissionSlugs) {
    revalidatePath(`/${ctx.yearSlug}/${ctx.subjectSlug}/${commissionSlug}`)
  }
}

export function revalidateSubjectEvents(ctx: SubjectRevalidationContext): void {
  revalidateSubjectContent(ctx)
  revalidateTag(queryTags.upcomingEvents)
}

export function revalidateSubjectApuntes(ctx: SubjectRevalidationContext): void {
  revalidateSubjectContent(ctx)
  revalidateTag(queryTags.latestApuntes)
  revalidateTag(queryTags.upcomingEvents)
}

export class ActionInputError extends Error {}

// "YYYY-MM-DD" → Date a medianoche UTC para guardar en la columna `@db.Date`.
export const fechaToDbDate = (fecha: string): Date => new Date(`${fecha}T00:00:00.000Z`)

// Botón de acceso rápido genérico (vale para materias y años). El icono se
// resuelve del favicon de la URL, así que no hay "tipo": solo texto y enlace.
const linkItemSchema = z.object({
  label: z.string().trim(),
  url: z
    .string()
    .trim()
    .url()
    .refine(
      (u) => {
        try {
          const protocol = new URL(u).protocol
          return protocol === 'https:' || protocol === 'http:'
        } catch {
          return false
        }
      },
      { message: 'El enlace debe empezar con http:// o https://' },
    ),
})

// Lee el campo `links` (JSON) del form y devuelve la lista normalizada y
// ordenada. Si falta el texto del botón, usa el dominio del enlace.
export function parseLinksFromForm(formData: FormData): { label: string; url: string; orden: number }[] {
  let raw: z.infer<typeof linkItemSchema>[] = []
  try {
    const linksJson = formData.get('links')
    if (typeof linksJson === 'string' && linksJson.trim() !== '') {
      const parsed = z.array(linkItemSchema).safeParse(JSON.parse(linksJson))
      if (parsed.success) raw = parsed.data
    }
  } catch {
    raw = []
  }
  return raw.map((l, i) => ({
    label: l.label.trim() || hostnameLabel(l.url),
    url: l.url,
    orden: i,
  }))
}
