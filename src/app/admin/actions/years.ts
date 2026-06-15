'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getYearDeleteImpact, queryTags, type YearDeleteImpact } from '@/lib/queries'
import {
  deleteYearStorage,
  listQuizBankContributionRevocations,
  quizBanksCacheTag,
} from '@/lib/storage'
import { uniqueSlug, yearSlugFromNumber } from '@/lib/slug'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { revokeContributionBatch } from '@/lib/contributions'
import { isReservedYearSlug, reservedYearSlugSet } from '@/lib/year-slugs'
import { parseLinksFromForm, requireAuth, revalidateTag } from './shared'

export interface YearActionState {
  ok: boolean
  message: string
}

const yearSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  descripcion: z.string().trim().max(500).default(''),
  orden: z.coerce
    .number()
    .int('El orden debe ser un número entero')
    .min(1, 'El orden debe ser mayor a 0'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i, 'El color debe ser un hexadecimal válido (#rrggbb)')
    .or(z.literal(''))
    .nullable()
    .optional(),
})

export async function createYearAction(
  _prev: YearActionState,
  formData: FormData,
): Promise<YearActionState> {
  const admin = await requireAuth('general')

  const parsed = yearSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
    orden: formData.get('orden'),
    color: formData.get('color') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion, orden, color } = parsed.data

  const links = parseLinksFromForm(formData)

  const career = await prisma.career.findFirst({ select: { id: true } })
  if (!career) {
    return { ok: false, message: 'No existe una carrera configurada.' }
  }

  const base = yearSlugFromNumber(orden)
  if (isReservedYearSlug(base)) {
    return {
      ok: false,
      message: 'Ese nombre coincide con una sección del sitio. Probá con otro.',
    }
  }

  const existingSlugs = await prisma.academicYear.findMany({
    select: { slug: true },
  })
  const takenSlugs = new Set([
    ...existingSlugs.map((y) => y.slug),
    ...reservedYearSlugSet(),
  ])
  const slug = uniqueSlug(base, takenSlugs)

  const year = await prisma.academicYear.create({
    data: {
      nombre,
      slug,
      descripcion,
      orden,
      color: color || null,
      careerId: career.id,
      links: links.length > 0 ? { create: links } : undefined,
    },
    select: { id: true },
  })

  revalidateTag(queryTags.career)
  revalidatePath('/')
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.YEAR_CREATED,
    entityType: 'year',
    entityId: year.id,
    yearId: year.id,
    yearSlug: slug,
    detail: { nombre, slug, orden },
  })
  return { ok: true, message: 'Año creado correctamente.' }
}

export async function updateYearAction(
  _prev: YearActionState,
  formData: FormData,
): Promise<YearActionState> {
  const admin = await requireAuth('general')

  const id = z.string().min(1).parse(formData.get('id'))

  const parsed = yearSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
    orden: formData.get('orden'),
    color: formData.get('color') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion, orden, color } = parsed.data

  const links = parseLinksFromForm(formData)

  const year = await prisma.academicYear.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!year) return { ok: false, message: 'Año no encontrado.' }

  const oldSlug = year.slug

  const base = yearSlugFromNumber(orden)
  if (isReservedYearSlug(base)) {
    return {
      ok: false,
      message: 'Ese nombre coincide con una sección del sitio. Probá con otro.',
    }
  }

  const existingSlugs = await prisma.academicYear.findMany({
    where: { id: { not: id } },
    select: { slug: true },
  })
  const takenSlugs = new Set([
    ...existingSlugs.map((y) => y.slug),
    ...reservedYearSlugSet(),
  ])
  const newSlug = uniqueSlug(base, takenSlugs)

  await prisma.$transaction(async (tx) => {
    await tx.academicYear.update({
      where: { id },
      data: {
        nombre,
        slug: newSlug,
        descripcion,
        orden,
        color: color || null,
      },
    })
    // Reemplazo total: borra los links actuales y recrea según el formulario.
    await tx.yearLink.deleteMany({ where: { yearId: id } })
    if (links.length > 0) {
      await tx.yearLink.createMany({
        data: links.map((l) => ({ yearId: id, ...l })),
      })
    }
  })

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(oldSlug))
  if (newSlug !== oldSlug) revalidateTag(queryTags.year(newSlug))
  revalidatePath('/')
  revalidatePath(`/${oldSlug}`)
  revalidatePath(`/${oldSlug}/calendario`)
  if (newSlug !== oldSlug) {
    revalidatePath(`/${newSlug}`)
    revalidatePath(`/${newSlug}/calendario`)
  }
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.YEAR_UPDATED,
    entityType: 'year',
    entityId: id,
    yearId: id,
    yearSlug: newSlug,
    detail: { nombre, oldSlug, newSlug, orden },
  })
  return { ok: true, message: 'Año actualizado correctamente.' }
}

export async function deleteYearAction(formData: FormData): Promise<void> {
  const admin = await requireAuth('general')
  const id = z.string().min(1).parse(formData.get('id'))

  // Capturar toda la info ANTES de borrar (la cascada elimina los registros)
  const year = await prisma.academicYear.findUnique({
    where: { id },
    select: {
      slug: true,
      nombre: true,
      subjects: {
        select: {
          slug: true,
          apuntes: {
            where: { createdByUserId: { not: null } },
            select: {
              createdByUserId: true,
              _count: { select: { recursos: true } },
            },
          },
          agendas: {
            select: {
              eventos: {
                where: { createdByUserId: { not: null } },
                select: { createdByUserId: true },
              },
            },
          },
        },
      },
    },
  })
  if (!year) return

  // Agrupar contribuciones por usuario antes de borrar
  const userRevokeMap = new Map<
    string,
    { apuntes: number; eventos: number; bancos: number; puntaje: number }
  >()
  for (const subject of year.subjects) {
    for (const apunte of subject.apuntes) {
      if (!apunte.createdByUserId) continue
      const prev = userRevokeMap.get(apunte.createdByUserId) ?? {
        apuntes: 0,
        eventos: 0,
        bancos: 0,
        puntaje: 0,
      }
      const recursosCount = apunte._count.recursos
      prev.apuntes += 1
      prev.puntaje += 1 + Math.max(0, recursosCount)
      userRevokeMap.set(apunte.createdByUserId, prev)
    }
    for (const agenda of subject.agendas) {
      for (const evento of agenda.eventos) {
        if (!evento.createdByUserId) continue
        const prev = userRevokeMap.get(evento.createdByUserId) ?? {
          apuntes: 0,
          eventos: 0,
          bancos: 0,
          puntaje: 0,
        }
        prev.eventos += 1
        prev.puntaje += 1
        userRevokeMap.set(evento.createdByUserId, prev)
      }
    }
  }

  const quizBankRevocationsBySubject = await Promise.all(
    year.subjects.map((subject) =>
      listQuizBankContributionRevocations(year.slug, subject.slug),
    ),
  )
  for (const revocations of quizBankRevocationsBySubject) {
    for (const revocation of revocations) {
      const prev = userRevokeMap.get(revocation.ownerId) ?? {
        apuntes: 0,
        eventos: 0,
        bancos: 0,
        puntaje: 0,
      }
      prev.bancos += 1
      prev.puntaje += 1 + Math.max(0, revocation.unitsCount)
      userRevokeMap.set(revocation.ownerId, prev)
    }
  }

  const storageTargets = year.subjects.map((s) => ({
    yearSlug: year.slug,
    subjectSlug: s.slug,
  }))

  // Limpiar Storage ANTES de borrar en BD
  try {
    await deleteYearStorage(storageTargets)
  } catch {
    console.error(`Storage cleanup parcial para año ${year.slug}`)
  }

  await prisma.academicYear.delete({ where: { id } })

  // Revocar contribuciones de usuarios afectados
  for (const [userId, counts] of userRevokeMap) {
    await revokeContributionBatch(userId, {
      apuntesCreados: counts.apuntes,
      eventosCreados: counts.eventos,
      bancosPreguntasCreados: counts.bancos,
      puntaje: counts.puntaje,
    })
  }

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(year.slug))
  for (const s of year.subjects) {
    revalidateTag(queryTags.subject(s.slug))
    revalidateTag(quizBanksCacheTag(year.slug, s.slug))
  }
  revalidatePath('/')
  revalidatePath(`/${year.slug}`)
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.YEAR_DELETED,
    entityType: 'year',
    entityId: id,
    yearId: id,
    yearSlug: year.slug,
    detail: {
      nombre: year.nombre,
      slug: year.slug,
      subjectsCount: year.subjects.length,
    },
  })
}

// Acción para obtener el impacto de eliminar un año (usada por el modal)
export async function getYearDeleteImpactAction(
  formData: FormData,
): Promise<YearDeleteImpact | null> {
  await requireAuth('general')
  const id = z.string().min(1).parse(formData.get('id'))
  return getYearDeleteImpact(id)
}
