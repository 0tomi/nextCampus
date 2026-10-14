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

function invalidateTags(tags: readonly string[]): void {
  for (const tag of new Set(tags)) invalidateTag(tag)
}

function revalidateSubjectPaths(ctx: SubjectRevalidationContext): void {
  revalidatePath(`/${ctx.yearSlug}`)
  revalidatePath(`/${ctx.yearSlug}/calendario`)
  revalidatePath(`/${ctx.yearSlug}/${ctx.subjectSlug}`)
  for (const commissionSlug of new Set(ctx.commissionSlugs)) {
    revalidatePath(`/${ctx.yearSlug}/${ctx.subjectSlug}/${commissionSlug}`)
  }
}

// Structural subject/commission mutations, not ordinary content edits.
export function revalidateSubjectContent(ctx: SubjectRevalidationContext): void {
  invalidateTags([
    queryTags.subject(ctx.subjectSlug), queryTags.subjectContent(ctx.subjectSlug),
    queryTags.year(ctx.yearSlug), queryTags.latestApuntesByYear(ctx.yearSlug),
  ])
  revalidateSubjectPaths(ctx)
}

export function revalidateSubjectEvents(ctx: SubjectRevalidationContext): void {
  invalidateTags([queryTags.subjectContent(ctx.subjectSlug), queryTags.year(ctx.yearSlug), queryTags.upcomingEvents])
  revalidateSubjectPaths(ctx)
}

export type ApunteRevalidationContext = SubjectRevalidationContext & {
  apunteSlugs: readonly string[]
  affectsRelatedEvents: boolean
}

export function revalidateSubjectApuntes(ctx: ApunteRevalidationContext): void {
  invalidateTags([
    queryTags.subjectContent(ctx.subjectSlug), queryTags.latestApuntes,
    queryTags.latestApuntesByYear(ctx.yearSlug),
    ...ctx.apunteSlugs.map((slug) => queryTags.apunte(ctx.subjectSlug, slug)),
    ...(ctx.affectsRelatedEvents ? [queryTags.year(ctx.yearSlug), queryTags.upcomingEvents] : []),
  ])
  revalidateSubjectPaths(ctx)
  for (const slug of new Set(ctx.apunteSlugs)) {
    revalidatePath(`/${ctx.yearSlug}/${ctx.subjectSlug}/apuntes/${slug}`)
  }
}

export type AuthorRevalidationContext = {
  subjectSlugs: readonly string[]
  eventYearSlugs: readonly string[]
}

export function revalidateAuthorNames(ctx: AuthorRevalidationContext): void {
  invalidateTags([
    ...ctx.subjectSlugs.map(queryTags.subjectAuthors),
    ...ctx.eventYearSlugs.map(queryTags.year),
  ])
}

export function revalidateCareerListing(): void {
  invalidateTag(queryTags.career)
  revalidatePath('/')
}

export function revalidateYearContent(yearSlug: string): void {
  invalidateTags([queryTags.career, queryTags.year(yearSlug), queryTags.latestApuntesByYear(yearSlug)])
  revalidatePath('/')
  revalidatePath(`/${yearSlug}`)
  revalidatePath(`/${yearSlug}/calendario`)
}

export function revalidateYearUpdate(oldSlug: string, newSlug: string): void {
  const slugs = [...new Set([oldSlug, newSlug])]
  invalidateTags([queryTags.career, ...slugs.flatMap((slug) => [queryTags.year(slug), queryTags.yearMeta(slug), queryTags.latestApuntesByYear(slug)])])
  revalidatePath('/')
  for (const slug of slugs) {
    revalidatePath(`/${slug}`)
    revalidatePath(`/${slug}/calendario`)
  }
}

export function revalidateYearRemoval(yearSlug: string, subjectSlugs: readonly string[]): void {
  revalidateYearUpdate(yearSlug, yearSlug)
  invalidateTags(subjectSlugs.flatMap((slug) => [queryTags.subject(slug), queryTags.quizBanks(yearSlug, slug)]))
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
