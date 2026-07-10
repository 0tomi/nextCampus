import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { requireGeneralAdmin, requireAcademicManager, requireAnyAdmin } from '@/lib/auth'
import { queryTags } from '@/lib/queries'
import { hostnameLabel } from '@/lib/linkFavicon'

// updateTag (a diferencia del revalidateTag de next/cache) invalida en el
// momento y da semántica read-your-own-writes: el propio request de la server
// action ya ve los datos frescos, en vez de servir una versión vieja mientras
// revalida en background. Next 16 solo permite llamarlo dentro de una Server
// Action, que es el único contexto desde el que se usa este wrapper.
export function invalidateTag(tag: string): void {
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
  invalidateTag(queryTags.subject(ctx.subjectSlug))
  invalidateTag(queryTags.year(ctx.yearSlug))
  revalidatePath(`/${ctx.yearSlug}`)
  revalidatePath(`/${ctx.yearSlug}/calendario`)
  revalidatePath(`/${ctx.yearSlug}/${ctx.subjectSlug}`)

  for (const commissionSlug of ctx.commissionSlugs) {
    revalidatePath(`/${ctx.yearSlug}/${ctx.subjectSlug}/${commissionSlug}`)
  }
}

export function revalidateSubjectEvents(ctx: SubjectRevalidationContext): void {
  revalidateSubjectContent(ctx)
  invalidateTag(queryTags.upcomingEvents)
}

export function revalidateSubjectApuntes(ctx: SubjectRevalidationContext): void {
  revalidateSubjectContent(ctx)
  invalidateTag(queryTags.latestApuntes)
  invalidateTag(queryTags.upcomingEvents)
}

// Alta de año: solo cambia el listado de años de la carrera y la home.
export function revalidateCareerListing(): void {
  invalidateTag(queryTags.career)
  revalidatePath('/')
}

// Contenido de un año (materias, links): listado de carrera + tag del año,
// más home, landing del año y su calendario.
export function revalidateYearContent(yearSlug: string): void {
  invalidateTag(queryTags.career)
  invalidateTag(queryTags.year(yearSlug))
  revalidatePath('/')
  revalidatePath(`/${yearSlug}`)
  revalidatePath(`/${yearSlug}/calendario`)
}

// Update de año: invalida el slug viejo y, si el update lo cambió, también
// el tag y las rutas del slug nuevo.
export function revalidateYearUpdate(oldSlug: string, newSlug: string): void {
  revalidateYearContent(oldSlug)
  if (newSlug !== oldSlug) {
    invalidateTag(queryTags.year(newSlug))
    revalidatePath(`/${newSlug}`)
    revalidatePath(`/${newSlug}/calendario`)
  }
}

// Borrado de año: además del año en sí, cae todo lo que cuelga de él
// (cada materia y sus bancos de quiz), más home y landing del año.
export function revalidateYearRemoval(
  yearSlug: string,
  subjectSlugs: readonly string[],
): void {
  invalidateTag(queryTags.career)
  invalidateTag(queryTags.year(yearSlug))
  for (const subjectSlug of subjectSlugs) {
    invalidateTag(queryTags.subject(subjectSlug))
    invalidateTag(queryTags.quizBanks(yearSlug, subjectSlug))
  }
  revalidatePath('/')
  revalidatePath(`/${yearSlug}`)
}

// Definidos en un módulo hoja sin dependencias server-only para que también
// puedan importarse desde actions fuera de esta carpeta (ej: perfil, users).
export { ActionInputError, actionError } from './errors'

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
