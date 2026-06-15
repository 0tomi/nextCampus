'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireYearAdminForSubjectId, requireYearAdminForYearId } from '@/lib/auth'
import { getSubjectDeleteImpact, queryTags, type SubjectDeleteImpact } from '@/lib/queries'
import {
  deleteSubjectStorage,
  listQuizBankContributionRevocations,
  quizBanksCacheTag,
} from '@/lib/storage'
import { slugify, uniqueSlug } from '@/lib/slug'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { revokeContributionBatch } from '@/lib/contributions'
import {
  parseLinksFromForm,
  requireAuth,
  revalidateSubjectContent,
  revalidateTag,
} from './shared'

export type SubjectActionState =
  | { ok: false; message: string }
  | {
      ok: true
      message: string
      /** Slug recalculado tras un update; permite al cliente navegar a la URL nueva. */
      newSlug?: string
      /** Slug del año al que pertenece la materia tras el update. */
      yearSlug?: string
    }

export interface CommissionActionState {
  ok: boolean
  message: string
}

const subjectSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
  descripcion: z.string().trim().max(500).default(''),
})

const commissionSchema = z.object({
  subjectId: z.string().trim().min(1, 'La materia es obligatoria.'),
  nombre: z.string().trim().min(1, 'El nombre de la comisión es obligatorio.').max(120),
})

const DEFAULT_SUBJECT_COMMISSION = {
  slug: 'comision-1',
  nombre: 'Comisión 1',
} as const

export async function createSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const admin = await requireAuth('academic')
  const yearId = z.string().min(1).parse(formData.get('yearId'))
  await requireYearAdminForYearId(yearId)

  const parsed = subjectSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion } = parsed.data

  const links = parseLinksFromForm(formData)

  const year = await prisma.academicYear.findUnique({
    where: { id: yearId },
    select: { slug: true },
  })
  if (!year) return { ok: false, message: 'Año no encontrado.' }

  const existingSlugs = await prisma.subject.findMany({
    select: { slug: true },
  })
  const takenSlugs = new Set(existingSlugs.map((s) => s.slug))
  const base = slugify(nombre)
  const slug = uniqueSlug(base, takenSlugs)

  // Crear materia + agenda general + comisión inicial + agenda específica en una transacción
  const subject = await prisma.$transaction(async (tx) => {
    const created = await tx.subject.create({
      data: { nombre, slug, descripcion, yearId },
      select: { id: true },
    })

    if (links.length > 0) {
      await tx.subjectLink.createMany({
        data: links.map((l) => ({ subjectId: created.id, ...l })),
      })
    }

    await tx.agenda.create({ data: { subjectId: created.id } })

    const commission = await tx.commission.create({
      data: {
        subjectId: created.id,
        slug: DEFAULT_SUBJECT_COMMISSION.slug,
        nombre: DEFAULT_SUBJECT_COMMISSION.nombre,
      },
      select: { id: true },
    })

    await tx.agenda.create({
      data: {
        subjectId: created.id,
        commissionId: commission.id,
      },
    })

    return created
  })

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(year.slug))
  revalidatePath('/')
  revalidatePath(`/${year.slug}`)
  revalidatePath(`/${year.slug}/calendario`)
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.SUBJECT_CREATED,
    entityType: 'subject',
    entityId: subject.id,
    yearId,
    yearSlug: year.slug,
    detail: { nombre, slug, yearSlug: year.slug },
  })
  return { ok: true, message: 'Materia creada correctamente.' }
}

export async function createCommissionAction(
  _prev: CommissionActionState,
  formData: FormData,
): Promise<CommissionActionState> {
  await requireAuth('academic')
  const parsed = commissionSchema.safeParse({
    subjectId: formData.get('subjectId'),
    nombre: formData.get('nombre'),
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }

  const { subjectId, nombre } = parsed.data
  const scope = await requireYearAdminForSubjectId(subjectId)
  if (!scope) return { ok: false, message: 'Materia no encontrada.' }

  const commission = await prisma.$transaction(async (tx) => {
    const existingSlugs = await tx.commission.findMany({
      where: { subjectId },
      select: { slug: true },
    })
    const takenSlugs = new Set(existingSlugs.map((item) => item.slug))
    const base = slugify(nombre)
    const slug = uniqueSlug(base, takenSlugs)

    const created = await tx.commission.create({
      data: {
        subjectId,
        nombre,
        slug,
      },
      select: {
        id: true,
        slug: true,
        nombre: true,
      },
    })

    await tx.agenda.create({
      data: {
        subjectId,
        commissionId: created.id,
      },
    })

    return created
  })

  revalidateTag(queryTags.career)
  revalidateSubjectContent({
    ...scope,
    commissionSlugs: [...scope.commissionSlugs, commission.slug],
  })
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.COMMISSION_CREATED,
    entityType: 'commission',
    entityId: commission.id,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      nombre: commission.nombre,
      slug: commission.slug,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
    },
  })

  return { ok: true, message: 'Comisión creada correctamente.' }
}

export async function updateSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  await requireAuth('academic')
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return { ok: false, message: 'Materia no encontrada.' }

  const parsed = subjectSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion } = parsed.data

  const links = parseLinksFromForm(formData)

  const oldSlug = scope.subjectSlug

  const existingSlugs = await prisma.subject.findMany({
    where: { id: { not: id } },
    select: { slug: true },
  })
  const takenSlugs = new Set(existingSlugs.map((s) => s.slug))
  const base = slugify(nombre)
  const newSlug = uniqueSlug(base, takenSlugs)

  await prisma.$transaction(async (tx) => {
    await tx.subject.update({
      where: { id },
      data: {
        nombre,
        slug: newSlug,
        descripcion,
      },
    })

    // Full replace: delete existing links, then recreate
    await tx.subjectLink.deleteMany({ where: { subjectId: id } })
    if (links.length > 0) {
      await tx.subjectLink.createMany({
        data: links.map((l) => ({ subjectId: id, ...l })),
      })
    }
  })

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(scope.yearSlug))
  revalidateTag(queryTags.subject(oldSlug))
  if (newSlug !== oldSlug) revalidateTag(queryTags.subject(newSlug))
  revalidatePath('/')
  revalidatePath(`/${scope.yearSlug}`)
  revalidatePath(`/${scope.yearSlug}/calendario`)
  revalidatePath(`/${scope.yearSlug}/${oldSlug}`)
  if (newSlug !== oldSlug) revalidatePath(`/${scope.yearSlug}/${newSlug}`)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.SUBJECT_UPDATED,
    entityType: 'subject',
    entityId: id,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: { nombre, oldSlug, newSlug, yearSlug: scope.yearSlug },
  })
  return {
    ok: true,
    message: 'Materia actualizada correctamente.',
    newSlug,
    yearSlug: scope.yearSlug,
  }
}

export async function deleteSubjectAction(formData: FormData): Promise<void> {
  await requireAuth('academic')
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return

  const { subjectSlug, yearSlug } = scope

  const subject = await prisma.subject.findUnique({
    where: { id },
    select: {
      nombre: true,
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
  })

  // Agrupar contribuciones por usuario antes de borrar
  const userRevokeMap = new Map<
    string,
    { apuntes: number; eventos: number; bancos: number; puntaje: number }
  >()
  if (subject) {
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

  const quizBankRevocations = await listQuizBankContributionRevocations(
    yearSlug,
    subjectSlug,
  )
  for (const revocation of quizBankRevocations) {
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

  // Limpiar Storage ANTES de borrar en BD
  try {
    await deleteSubjectStorage(yearSlug, subjectSlug)
  } catch {
    console.error(`Storage cleanup parcial para materia ${subjectSlug}`)
  }

  await prisma.subject.delete({ where: { id } })

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
  revalidateTag(queryTags.year(yearSlug))
  revalidateTag(queryTags.subject(subjectSlug))
  revalidateTag(quizBanksCacheTag(yearSlug, subjectSlug))
  revalidatePath('/')
  revalidatePath(`/${yearSlug}`)
  revalidatePath(`/${yearSlug}/calendario`)
  revalidatePath(`/${yearSlug}/${subjectSlug}`)
  if (subject) {
    await recordAudit({
      userId: scope.admin.id,
      action: AUDIT_ACTIONS.SUBJECT_DELETED,
      entityType: 'subject',
      entityId: id,
      yearId: scope.yearId,
      yearSlug,
      detail: { nombre: subject.nombre, slug: subjectSlug, yearSlug },
    })
  }
}

// Acción para obtener el impacto de eliminar una materia (usada por el modal)
export async function getSubjectDeleteImpactAction(
  formData: FormData,
): Promise<SubjectDeleteImpact | null> {
  await requireAuth('academic')
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return null

  return getSubjectDeleteImpact(id)
}
