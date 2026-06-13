import { revalidatePath, revalidateTag as revalidateTagRaw } from 'next/cache'
import { requireGeneralAdmin, requireAcademicManager, requireAnyAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { queryTags } from '@/lib/queries'

// Next 16 exige un perfil de cacheLife como segundo argumento de
// revalidateTag. Usamos "max" (stale-while-revalidate) en todas las
// invalidaciones admin: el siguiente request sirve la versión vieja y
// dispara la regeneración en background.
export function revalidateTag(tag: string): void {
  revalidateTagRaw(tag, 'max')
}

// Toda escritura: auth específico (general o por año) -> Zod -> sanitize.

export type AdminAuthScope = 'any' | 'academic' | 'general'

export async function requireAuth(scope: AdminAuthScope = 'any') {
  if (scope === 'general') return requireGeneralAdmin()
  if (scope === 'academic') return requireAcademicManager()
  return requireAnyAdmin()
}

export async function revalidateSubjectContent(subjectSlug: string): Promise<void> {
  // Invalida los caches granulares por tag. Los revalidatePath quedan como
  // red de seguridad para las rutas afectadas.
  revalidateTag(queryTags.subject(subjectSlug))
  revalidateTag(queryTags.upcomingEvents)
  revalidateTag(queryTags.latestApuntes)

  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: {
      year: { select: { slug: true } },
      commissions: {
        select: { slug: true },
      },
    },
  })
  if (subject?.year?.slug) {
    revalidateTag(queryTags.year(subject.year.slug))
    revalidatePath(`/${subject.year.slug}`)
    revalidatePath(`/${subject.year.slug}/calendario`)
    revalidatePath(`/${subject.year.slug}/${subjectSlug}`)
    revalidatePath(`/${subject.year.slug}/${subjectSlug}/quiz`)

    for (const commission of subject.commissions) {
      revalidatePath(`/${subject.year.slug}/${subjectSlug}/${commission.slug}`)
    }
  }
}

export class ActionInputError extends Error {}

// "YYYY-MM-DD" → Date a medianoche UTC para guardar en la columna `@db.Date`.
export const fechaToDbDate = (fecha: string): Date => new Date(`${fecha}T00:00:00.000Z`)
