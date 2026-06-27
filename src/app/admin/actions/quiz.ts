'use server'

import { z } from 'zod'
import { requireYearAdminForSubjectSlug } from '@/lib/auth'
import {
  uploadQuizBank,
  deleteQuizBank,
  getQuizBankMeta,
  readQuizBank,
  quizBanksCacheTag,
} from '@/lib/storage'
import { parseQuizBank } from '@/lib/domain/quiz-bank'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { awardQuizBankCreated, revokeQuizBankCreated } from '@/lib/contributions'
import { requireAuth, revalidateTag } from './shared'

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
  await requireAuth()
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
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar el banco. Probá de nuevo.',
    }
  }
  await awardQuizBankCreated(scope.admin.id, bank.bank.units.length)

  revalidateTag(quizBanksCacheTag(scope.yearSlug, scope.subjectSlug))
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

export async function deleteQuizBankAction(formData: FormData): Promise<void> {
  await requireAuth()
  const subjectSlug = z.string().min(1).parse(formData.get('subjectSlug'))
  const bankId = z.uuid().parse(formData.get('bankId'))
  const scope = await requireYearAdminForSubjectSlug(subjectSlug)
  if (!scope) return
  const meta = await getQuizBankMeta(scope.yearSlug, scope.subjectSlug, bankId)
  // Ownership por id (criterio del resto del sistema). Para metas viejas sin
  // subidoPorId se cae al email como fallback de compatibilidad.
  const ownsBank = meta?.subidoPorId
    ? meta.subidoPorId === scope.admin.id
    : meta?.subidoPor === scope.admin.email
  if (!scope.admin.canManageAnyContribution && !ownsBank) {
    return
  }

  // Leer el banco completo antes de borrar para obtener el count de units
  const bank = await readQuizBank(scope.yearSlug, scope.subjectSlug, bankId)
  const unitsCount = bank?.units.length ?? 0
  const ownerId = meta?.subidoPorId

  await deleteQuizBank(scope.yearSlug, scope.subjectSlug, bankId)

  if (ownerId) {
    await revokeQuizBankCreated(ownerId, unitsCount)
  }

  revalidateTag(quizBanksCacheTag(scope.yearSlug, scope.subjectSlug))
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
