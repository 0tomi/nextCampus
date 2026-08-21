'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  ensureCanManageContribution,
  requireAnyAdmin,
  requireYearAdminForAgendaId,
  requireYearAdminForCommissionId,
  requireYearAdminForEventoId,
} from '@/lib/auth'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { awardEventoCreated, revokeEventoCreated } from '@/lib/contributions'
import {
  requireAuth,
  ActionInputError,
  actionError,
  revalidateSubjectEvents,
  fechaToDbDate,
} from './shared'

const optionalEntityIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value

    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  },
  z.string().min(1).nullable(),
)

// La hora es OPCIONAL: el input de hora vacío ("") se normaliza a null.
const horaSchema = z.preprocess(
  (value) => (value === '' || value == null ? null : value),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora no es válida.')
    .nullable(),
)

const eventoSchema = z.object({
  agendaId: z.string().trim().min(1),
  commissionId: optionalEntityIdSchema,
  tipoEventoId: z.string().trim().min(1),
  titulo: z.string().trim().min(1).max(200),
  descripcion: z.string().max(20000).default(''),
  // Día calendario "YYYY-MM-DD" (sin hora). La hora va aparte y es opcional.
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  hora: horaSchema,
})

const relatedApunteIdsSchema = z.array(z.string().trim().min(1)).max(12)

function parseRelatedApunteIds(raw: unknown): string[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return []
  try {
    const parsed = JSON.parse(raw)
    const result = relatedApunteIdsSchema.safeParse(parsed)
    if (!result.success) return null
    return [...new Set(result.data)]
  } catch {
    return null
  }
}

async function validateRelatedApunteIds(
  apunteIds: string[],
  subjectId: string,
): Promise<boolean> {
  if (apunteIds.length === 0) return true
  const count = await prisma.apunte.count({
    where: {
      id: { in: apunteIds },
      subjectId,
    },
  })
  return count === apunteIds.length
}

async function resolveAgendaTarget(input: {
  agendaId: string
  commissionId: string | null
}) {
  const agendaScope = await requireYearAdminForAgendaId(input.agendaId)
  if (!agendaScope) {
    throw new ActionInputError('No encontramos la agenda seleccionada.')
  }

  if (!input.commissionId) {
    return agendaScope
  }

  const commissionScope = await requireYearAdminForCommissionId(input.commissionId)
  if (!commissionScope) {
    throw new ActionInputError('No encontramos la comisión seleccionada.')
  }

  if (commissionScope.subjectId !== agendaScope.subjectId) {
    throw new ActionInputError('La comisión elegida no pertenece a esta materia.')
  }

  const targetAgenda = await prisma.agenda.findFirst({
    where: {
      subjectId: agendaScope.subjectId,
      commissionId: commissionScope.commissionId,
    },
    select: {
      id: true,
      commissionId: true,
      commission: {
        select: {
          slug: true,
        },
      },
    },
  })

  if (!targetAgenda) {
    throw new ActionInputError('La comisión elegida todavía no tiene agenda propia.')
  }

  return {
    ...agendaScope,
    agendaId: targetAgenda.id,
    commissionId: targetAgenda.commissionId,
    commissionSlug: targetAgenda.commission?.slug ?? commissionScope.commissionSlug,
  }
}

export async function createEvento(formData: FormData): Promise<void> {
  const rawDescripcion = formData.get('descripcion') ?? formData.get('descripcionHtml') ?? ''
  const data = eventoSchema.parse({
    agendaId: formData.get('agendaId'),
    commissionId: formData.get('commissionId'),
    tipoEventoId: formData.get('tipoEventoId'),
    titulo: formData.get('titulo'),
    descripcion: typeof rawDescripcion === 'string' ? rawDescripcion : '',
    fecha: formData.get('fecha'),
    hora: formData.get('hora'),
  })
  const scope = await resolveAgendaTarget({
    agendaId: data.agendaId,
    commissionId: data.commissionId,
  })
  const apunteIds = parseRelatedApunteIds(formData.get('apunteIdsJson'))
  if (apunteIds === null) {
    throw new ActionInputError('Revisá los apuntes relacionados.')
  }
  if (!(await validateRelatedApunteIds(apunteIds, scope.subjectId))) {
    throw new ActionInputError('Los apuntes relacionados tienen que ser de la misma materia.')
  }

  const evento = await prisma.evento.create({
    data: {
      agendaId: scope.agendaId,
      tipoEventoId: data.tipoEventoId,
      titulo: data.titulo,
      descripcion: data.descripcion.trim(),
      fecha: fechaToDbDate(data.fecha),
      hora: data.hora,
      createdByUserId: scope.admin.id,
      apuntes: {
        create: apunteIds.map((apunteId) => ({ apunteId })),
      },
    },
  })
  await awardEventoCreated(scope.admin.id)
  revalidateSubjectEvents(scope)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.EVENTO_CREATED,
    entityType: 'evento',
    entityId: evento.id,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      titulo: evento.titulo,
      fecha: data.fecha,
      hora: data.hora,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
      apuntesCount: apunteIds.length,
      ...(scope.commissionSlug ? { commissionSlug: scope.commissionSlug } : {}),
    },
  })
}

// Wrapper para useActionState en modales cliente
export interface EventoActionState {
  ok: boolean
  message: string
}

export async function createEventoAction(
  _prev: EventoActionState,
  formData: FormData,
): Promise<EventoActionState> {
  await requireAuth()
  try {
    await createEvento(formData)
    return { ok: true, message: 'Evento creado correctamente.' }
  } catch (err) {
    return actionError(err, 'No se pudo crear el evento. Intentá de nuevo.')
  }
}

export async function updateEventoFechaAction(
  id: string,
  nuevaFecha: string,
  _subjectSlug: string,
): Promise<{ ok: boolean }> {
  await requireAnyAdmin()
  void _subjectSlug
  const validId = z.string().min(1).parse(id)
  // El drag de calendario manda el día como "YYYY-MM-DD" (sin hora). La hora del
  // evento NO se toca al arrastrar.
  const validFecha = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.')
    .parse(nuevaFecha)
  const scope = await requireYearAdminForEventoId(validId)
  if (!scope) return { ok: false }
  const current = await prisma.evento.findUnique({
    where: { id: validId },
    select: { createdByUserId: true },
  })
  ensureCanManageContribution(scope.admin, current?.createdByUserId)

  const updated = await prisma.evento.update({
    where: { id: validId },
    data: { fecha: fechaToDbDate(validFecha) },
    select: { titulo: true },
  })
  revalidateSubjectEvents(scope)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.EVENTO_DATE_UPDATED,
    entityType: 'evento',
    entityId: validId,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      titulo: updated.titulo,
      fecha: validFecha,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
    },
  })
  return { ok: true }
}

export async function updateEvento(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get('id'))
  const rawDescripcion = formData.get('descripcion') ?? formData.get('descripcionHtml') ?? ''
  const data = eventoSchema.parse({
    agendaId: formData.get('agendaId'),
    commissionId: formData.get('commissionId'),
    tipoEventoId: formData.get('tipoEventoId'),
    titulo: formData.get('titulo'),
    descripcion: typeof rawDescripcion === 'string' ? rawDescripcion : '',
    fecha: formData.get('fecha'),
    hora: formData.get('hora'),
  })
  const currentScope = await requireYearAdminForEventoId(id)
  if (!currentScope) {
    throw new ActionInputError('No encontramos el evento que querés editar.')
  }
  const currentOwner = await prisma.evento.findUnique({
    where: { id },
    select: { createdByUserId: true },
  })
  ensureCanManageContribution(currentScope.admin, currentOwner?.createdByUserId)

  const targetScope = await resolveAgendaTarget({
    agendaId: data.agendaId,
    commissionId: data.commissionId,
  })

  if (targetScope.subjectId !== currentScope.subjectId) {
    throw new ActionInputError('No podés mover un evento a otra materia.')
  }
  const apunteIds = parseRelatedApunteIds(formData.get('apunteIdsJson'))
  if (apunteIds === null) {
    throw new ActionInputError('Revisá los apuntes relacionados.')
  }
  if (!(await validateRelatedApunteIds(apunteIds, currentScope.subjectId))) {
    throw new ActionInputError('Los apuntes relacionados tienen que ser de la misma materia.')
  }

  await prisma.$transaction(async (tx) => {
    await tx.evento.update({
      where: { id },
      data: {
        agendaId: targetScope.agendaId,
        tipoEventoId: data.tipoEventoId,
        titulo: data.titulo,
        descripcion: data.descripcion.trim(),
        fecha: fechaToDbDate(data.fecha),
        hora: data.hora,
      },
    })
    await tx.apunteEvento.deleteMany({ where: { eventoId: id } })
    if (apunteIds.length > 0) {
      await tx.apunteEvento.createMany({
        data: apunteIds.map((apunteId) => ({ eventoId: id, apunteId })),
        skipDuplicates: true,
      })
    }
  })
  revalidateSubjectEvents(currentScope)
  await recordAudit({
    userId: currentScope.admin.id,
    action: AUDIT_ACTIONS.EVENTO_UPDATED,
    entityType: 'evento',
    entityId: id,
    yearId: currentScope.yearId,
    yearSlug: currentScope.yearSlug,
    detail: {
      titulo: data.titulo,
      fecha: data.fecha,
      hora: data.hora,
      subjectSlug: currentScope.subjectSlug,
      yearSlug: currentScope.yearSlug,
      apuntesCount: apunteIds.length,
      ...(targetScope.commissionSlug ? { commissionSlug: targetScope.commissionSlug } : {}),
    },
  })
}

export async function updateEventoAction(
  _prev: EventoActionState,
  formData: FormData,
): Promise<EventoActionState> {
  await requireAuth()
  try {
    await updateEvento(formData)
    return { ok: true, message: 'Evento actualizado correctamente.' }
  } catch (err) {
    return actionError(err, 'No se pudo actualizar el evento. Intentá de nuevo.')
  }
}

export async function deleteEvento(formData: FormData): Promise<void> {
  await requireAnyAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForEventoId(id)
  if (!scope) return

  const evento = await prisma.evento.findUnique({
    where: { id },
    select: { titulo: true, fecha: true, hora: true, createdByUserId: true },
  })
  ensureCanManageContribution(scope.admin, evento?.createdByUserId)

  await prisma.evento.delete({ where: { id } })

  if (evento?.createdByUserId) {
    await revokeEventoCreated(evento.createdByUserId)
  }

  revalidateSubjectEvents(scope)
  if (evento) {
    await recordAudit({
      userId: scope.admin.id,
      action: AUDIT_ACTIONS.EVENTO_DELETED,
      entityType: 'evento',
      entityId: id,
      yearId: scope.yearId,
      yearSlug: scope.yearSlug,
      detail: {
        titulo: evento.titulo,
        fecha: evento.fecha.toISOString().slice(0, 10),
        hora: evento.hora,
        subjectSlug: scope.subjectSlug,
        yearSlug: scope.yearSlug,
      },
    })
  }
}
