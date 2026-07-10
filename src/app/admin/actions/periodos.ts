'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAcademicManager } from '@/lib/auth'
import { queryTags } from '@/lib/queries'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { PERIODO_TONES, type CategoriaPeriodoDto, type PeriodoTone } from '@/lib/periodos'
import { revalidateTag, actionError, fechaToDbDate } from './shared'

const periodoSchema = z
  .object({
    categoriaId: z.string().min(1, 'Elegí un tipo de período.'),
    titulo: z.string().trim().min(1, 'Poné un título.').max(200),
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de inicio no es válida.'),
    fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de fin no es válida.'),
  })
  // Comparación lexicográfica válida para "YYYY-MM-DD".
  .refine((d) => d.fechaFin >= d.fechaInicio, {
    message: 'La fecha de fin no puede ser anterior a la de inicio.',
    path: ['fechaFin'],
  })

const categoriaSchema = z.object({
  label: z.string().trim().min(1, 'El nombre del tipo es obligatorio.').max(100),
  tone: z.enum(PERIODO_TONES),
})

// Todas las vistas públicas consumen los períodos mediante este tag compartido.
function revalidatePeriodos(): void {
  revalidateTag(queryTags.periodos)
}

function parsePeriodoForm(formData: FormData) {
  return periodoSchema.parse({
    categoriaId: formData.get('categoriaId') || formData.get('categoria'),
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
  const admin = await requireAcademicManager()
  const data = parsePeriodoForm(formData)
  const periodo = await prisma.periodoAcademico.create({
    data: {
      categoriaId: data.categoriaId,
      titulo: data.titulo,
      fechaInicio: fechaToDbDate(data.fechaInicio),
      fechaFin: fechaToDbDate(data.fechaFin),
      createdByUserId: admin.id,
    },
  })
  revalidatePeriodos()
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.PERIODO_CREATED,
    entityType: 'periodo',
    entityId: periodo.id,
    detail: {
      categoriaId: data.categoriaId,
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
  await requireAcademicManager()
  try {
    await createPeriodo(formData)
    return { ok: true, message: 'Período creado correctamente.' }
  } catch (err) {
    return actionError(err, 'No se pudo crear el período. Intentá de nuevo.')
  }
}

async function updatePeriodo(formData: FormData): Promise<void> {
  const admin = await requireAcademicManager()
  const id = z.string().min(1).parse(formData.get('id'))
  const data = parsePeriodoForm(formData)
  await prisma.periodoAcademico.update({
    where: { id },
    data: {
      categoriaId: data.categoriaId,
      titulo: data.titulo,
      fechaInicio: fechaToDbDate(data.fechaInicio),
      fechaFin: fechaToDbDate(data.fechaFin),
    },
  })
  revalidatePeriodos()
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.PERIODO_UPDATED,
    entityType: 'periodo',
    entityId: id,
    detail: {
      categoriaId: data.categoriaId,
      titulo: data.titulo,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
    },
  })
}

export async function updatePeriodoAction(
  _prev: PeriodoActionState,
  formData: FormData,
): Promise<PeriodoActionState> {
  await requireAcademicManager()
  try {
    await updatePeriodo(formData)
    return { ok: true, message: 'Período actualizado correctamente.' }
  } catch (err) {
    return actionError(err, 'No se pudo actualizar el período. Intentá de nuevo.')
  }
}

export async function deletePeriodo(formData: FormData): Promise<void> {
  const admin = await requireAcademicManager()
  const id = z.string().min(1).parse(formData.get('id'))
  const periodo = await prisma.periodoAcademico.findUnique({
    where: { id },
    select: { categoriaId: true, titulo: true, fechaInicio: true, fechaFin: true },
  })
  if (!periodo) return
  await prisma.periodoAcademico.delete({ where: { id } })
  revalidatePeriodos()
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.PERIODO_DELETED,
    entityType: 'periodo',
    entityId: id,
    detail: {
      categoriaId: periodo.categoriaId,
      titulo: periodo.titulo,
      fechaInicio: periodo.fechaInicio.toISOString().slice(0, 10),
      fechaFin: periodo.fechaFin.toISOString().slice(0, 10),
    },
  })
}

export async function createCategoriaAction(
  _prev: PeriodoActionState & { data?: CategoriaPeriodoDto },
  formData: FormData,
): Promise<PeriodoActionState & { data?: CategoriaPeriodoDto }> {
  const admin = await requireAcademicManager()
  try {
    const data = categoriaSchema.parse({
      label: formData.get('label'),
      tone: formData.get('tone'),
    })

    const id = data.label
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')
      .toUpperCase()

    const existing = await prisma.categoriaPeriodo.findUnique({
      where: { id },
    })

    if (existing) {
      return { ok: false, message: 'Ya existe un tipo de período con este nombre o uno muy similar.' }
    }

    const categoria = await prisma.categoriaPeriodo.create({
      data: {
        id,
        label: data.label,
        tone: data.tone,
      },
    })

    revalidatePeriodos()

    await recordAudit({
      userId: admin.id,
      action: AUDIT_ACTIONS.PERIODO_CATEGORIA_CREATED,
      entityType: 'periodoCategoria',
      entityId: categoria.id,
      detail: {
        label: categoria.label,
        tone: categoria.tone,
      },
    })

    return {
      ok: true,
      message: 'Tipo de período creado correctamente.',
      data: {
        id: categoria.id,
        label: categoria.label,
        tone: categoria.tone as PeriodoTone,
      },
    }
  } catch (err) {
    return actionError(err, 'No se pudo crear el tipo de período. Intentá de nuevo.')
  }
}

