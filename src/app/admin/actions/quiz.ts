'use server'

import { z } from 'zod'
import { requireAnyAdmin, requireYearAdminForSubjectSlug } from '@/lib/auth'
import {
  uploadQuizBank,
  deleteQuizBank,
  getQuizBankMeta,
  readQuizBank,
  updateQuizBankMeta,
} from '@/lib/storage'
import { queryTags } from '@/lib/queries'
import {
  descriptionSchema,
  parseQuizBank,
  type QuizBankMeta,
} from '@/lib/domain/quiz-bank'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { awardQuizBankCreated, revokeQuizBankCreated } from '@/lib/contributions'
import { invalidateTag } from './shared'

export interface QuizBankActionState {
  ok: boolean
  message: string
}

const uploadBankSchema = z.object({
  subjectSlug: z.string().min(1),
  json: z.string().min(1).max(2 * 1024 * 1024),
})

// Sube un banco de preguntas. Valida el JSON ANTES de tocar Storage (forma +
// semántica, sin eval). El nombre del banco se deriva del title del JSON.
// Devuelve estado para feedback en el modal.
export async function uploadQuizBankAction(
  _prev: QuizBankActionState,
  formData: FormData,
): Promise<QuizBankActionState> {
  await requireAnyAdmin()
  const parsedForm = uploadBankSchema.safeParse({
    subjectSlug: formData.get('subjectSlug'),
    json: formData.get('json'),
  })
  if (!parsedForm.success) {
    return { ok: false, message: 'Seleccioná un archivo de preguntas válido.' }
  }
  const { subjectSlug, json } = parsedForm.data

  const scope = await requireYearAdminForSubjectSlug(subjectSlug)
  if (!scope) {
    return { ok: false, message: 'Materia no encontrada.' }
  }

  const bank = parseQuizBank(json)
  if (!bank.ok) {
    return { ok: false, message: bank.error }
  }

  // El nombre del banco se toma del title del JSON (sin depender del cliente).
  const nombre = bank.bank.title

  try {
    await uploadQuizBank({
      yearSlug: scope.yearSlug,
      subjectSlug: scope.subjectSlug,
      nombre,
      // Re-serializa la versión validada/normalizada (descarta basura extra).
      rawJson: JSON.stringify(bank.bank),
      totalPreguntas: bank.totalPreguntas,
      subidoPor: scope.admin.email,
      subidoPorId: scope.admin.id,
      descripcion: bank.bank.description,
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar el banco. Probá de nuevo.',
    }
  }
  invalidateTag(queryTags.quizBanks(scope.yearSlug, scope.subjectSlug))
  await awardQuizBankCreated(scope.admin.id, bank.bank.units.length)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.QUIZ_BANK_UPLOADED,
    entityType: 'quizBank',
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      nombre,
      totalPreguntas: bank.totalPreguntas,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
    },
  })
  return {
    ok: true,
    message: `Banco "${nombre}" cargado (${bank.totalPreguntas} preguntas).`,
  }
}

// Ownership por id (criterio del resto del sistema). Para metas viejas sin
// subidoPorId se cae al email como fallback de compatibilidad.
function canManageBank(
  meta: QuizBankMeta | null,
  admin: { id: string; email: string; canManageAnyContribution: boolean },
): boolean {
  if (admin.canManageAnyContribution) return true
  if (!meta) return false
  return meta.subidoPorId
    ? meta.subidoPorId === admin.id
    : meta.subidoPor === admin.email
}

const updateDescriptionSchema = z.object({
  subjectSlug: z.string().min(1),
  bankId: z.uuid(),
  descripcion: descriptionSchema,
})

// Edita la descripción de un banco. Solo el dueño (o quien gestiona cualquier
// aporte). Una descripción vacía la quita.
export async function updateQuizBankDescriptionAction(
  _prev: QuizBankActionState,
  formData: FormData,
): Promise<QuizBankActionState> {
  await requireAnyAdmin()
  const parsedForm = updateDescriptionSchema.safeParse({
    subjectSlug: formData.get('subjectSlug'),
    bankId: formData.get('bankId'),
    descripcion: formData.get('descripcion') ?? undefined,
  })
  if (!parsedForm.success) {
    return { ok: false, message: 'La descripción puede tener hasta 1000 caracteres.' }
  }
  const { subjectSlug, bankId, descripcion } = parsedForm.data

  const scope = await requireYearAdminForSubjectSlug(subjectSlug)
  if (!scope) {
    return { ok: false, message: 'Materia no encontrada.' }
  }
  const meta = await getQuizBankMeta(scope.yearSlug, scope.subjectSlug, bankId)
  if (!meta) {
    return { ok: false, message: 'Banco no encontrado.' }
  }
  if (!canManageBank(meta, scope.admin)) {
    return { ok: false, message: 'Solo quien subió el banco puede editarlo.' }
  }

  const nextMeta: QuizBankMeta = { ...meta, descripcion }
  if (!descripcion) delete nextMeta.descripcion

  try {
    await updateQuizBankMeta(scope.yearSlug, scope.subjectSlug, nextMeta)
  } catch {
    return { ok: false, message: 'No se pudo guardar la descripción. Probá de nuevo.' }
  }
  invalidateTag(queryTags.quizBanks(scope.yearSlug, scope.subjectSlug))
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.QUIZ_BANK_UPDATED,
    entityType: 'quizBank',
    entityId: bankId,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      nombre: meta.nombre,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
    },
  })
  return { ok: true, message: 'Descripción actualizada.' }
}

export async function deleteQuizBankAction(formData: FormData): Promise<void> {
  await requireAnyAdmin()
  const subjectSlug = z.string().min(1).parse(formData.get('subjectSlug'))
  const bankId = z.uuid().parse(formData.get('bankId'))
  const scope = await requireYearAdminForSubjectSlug(subjectSlug)
  if (!scope) return
  const meta = await getQuizBankMeta(scope.yearSlug, scope.subjectSlug, bankId)
  if (!canManageBank(meta, scope.admin)) {
    return
  }

  // Leer el banco completo antes de borrar para obtener el count de units
  const bank = await readQuizBank(scope.yearSlug, scope.subjectSlug, bankId)
  const unitsCount = bank?.units.length ?? 0
  const ownerId = meta?.subidoPorId

  await deleteQuizBank(scope.yearSlug, scope.subjectSlug, bankId)
  invalidateTag(queryTags.quizBanks(scope.yearSlug, scope.subjectSlug))

  if (ownerId) {
    await revokeQuizBankCreated(ownerId, unitsCount)
  }

  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.QUIZ_BANK_DELETED,
    entityType: 'quizBank',
    entityId: bankId,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      bankId,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
    },
  })
}
