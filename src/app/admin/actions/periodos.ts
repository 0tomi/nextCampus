'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireGeneralAdmin } from '@/lib/auth'
import { queryTags } from '@/lib/queries'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { revalidateTag, ActionInputError, fechaToDbDate } from './shared'

const periodoSchema = z
  .object({
    categoria: z.enum(['SUSPENSION_CLASES', 'MESAS_EXAMEN']),
    titulo: z.string().trim().min(1, 'Poné un título.').max(200),
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de inicio no es válida.'),
    fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de fin no es válida.'),
  })
  // Comparación lexicográfica válida para "YYYY-MM-DD".
  .refine((d) => d.fechaFin >= d.fechaInicio, {
    message: 'La fecha de fin no puede ser anterior a la de inicio.',
    path: ['fechaFin'],
  })

// Períodos globales: invalida el tag dedicado, el home y el calendario de cada año.
async function revalidatePeriodos(): Promise<void> {
  revalidateTag(queryTags.periodos)
  revalidatePath('/')
  const years = await prisma.academicYear.findMany({ select: { slug: true } })
  for (const year of years) {
    revalidateTag(queryTags.year(year.slug))
    revalidatePath(`/${year.slug}/calendario`)
  }
}

function parsePeriodoForm(formData: FormData) {
  return periodoSchema.parse({
    categoria: formData.get('categoria'),
    titulo: formData.get('titulo'),
    fechaInicio: formData.get('fechaInicio'),
    fechaFin: formData.get('fechaFin'),
  })
}

export interface PeriodoActionState {
  ok: boolean
  message: string
}

async function createPeriodo(formData: FormData): Promise<void> {
  const admin = await requireGeneralAdmin()
  const data = parsePeriodoForm(formData)
  const periodo = await prisma.periodoAcademico.create({
    data: {
      categoria: data.categoria,
      titulo: data.titulo,
      fechaInicio: fechaToDbDate(data.fechaInicio),
      fechaFin: fechaToDbDate(data.fechaFin),
      createdByUserId: admin.id,
    },
  })
  await revalidatePeriodos()
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.PERIODO_CREATED,
    entityType: 'periodo',
    entityId: periodo.id,
    detail: {
      categoria: data.categoria,
      titulo: data.titulo,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
    },
  })
}

export async function createPeriodoAction(
  _prev: PeriodoActionState,
  formData: FormData,
): Promise<PeriodoActionState> {
  await requireGeneralAdmin()
  try {
    await createPeriodo(formData)
    return { ok: true, message: 'Período creado correctamente.' }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues[0].message }
    }
    if (err instanceof ActionInputError) {
      return { ok: false, message: err.message }
    }
    return { ok: false, message: 'No se pudo crear el período. Intentá de nuevo.' }
  }
}

export async function updatePeriodoAction(
  _prev: PeriodoActionState,
  formData: FormData,
): Promise<PeriodoActionState> {
  const admin = await requireGeneralAdmin()
  try {
    const id = z.string().min(1).parse(formData.get('id'))
    const data = parsePeriodoForm(formData)
    await prisma.periodoAcademico.update({
      where: { id },
      data: {
        categoria: data.categoria,
        titulo: data.titulo,
        fechaInicio: fechaToDbDate(data.fechaInicio),
        fechaFin: fechaToDbDate(data.fechaFin),
      },
    })
    await revalidatePeriodos()
    await recordAudit({
      userId: admin.id,
      action: AUDIT_ACTIONS.PERIODO_UPDATED,
      entityType: 'periodo',
      entityId: id,
      detail: {
        categoria: data.categoria,
        titulo: data.titulo,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
      },
    })
    return { ok: true, message: 'Período actualizado correctamente.' }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues[0].message }
    }
    if (err instanceof ActionInputError) {
      return { ok: false, message: err.message }
    }
    return { ok: false, message: 'No se pudo actualizar el período. Intentá de nuevo.' }
  }
}

export async function deletePeriodo(formData: FormData): Promise<void> {
  const admin = await requireGeneralAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const periodo = await prisma.periodoAcademico.findUnique({
    where: { id },
    select: { categoria: true, titulo: true, fechaInicio: true, fechaFin: true },
  })
  if (!periodo) return
  await prisma.periodoAcademico.delete({ where: { id } })
  await revalidatePeriodos()
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.PERIODO_DELETED,
    entityType: 'periodo',
    entityId: id,
    detail: {
      categoria: periodo.categoria,
      titulo: periodo.titulo,
      fechaInicio: periodo.fechaInicio.toISOString().slice(0, 10),
      fechaFin: periodo.fechaFin.toISOString().slice(0, 10),
    },
  })
}
