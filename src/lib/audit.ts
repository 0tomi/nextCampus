import { prisma } from '@/lib/prisma'

export const AUDIT_ACTIONS = {
  SUBJECT_CREATED: 'SUBJECT_CREATED',
  SUBJECT_UPDATED: 'SUBJECT_UPDATED',
  SUBJECT_DELETED: 'SUBJECT_DELETED',
  SUBJECT_DRIVE_UPDATED: 'SUBJECT_DRIVE_UPDATED',
  SUBJECT_PLAYLIST_UPDATED: 'SUBJECT_PLAYLIST_UPDATED',

  COMMISSION_CREATED: 'COMMISSION_CREATED',

  APUNTE_CREATED: 'APUNTE_CREATED',
  APUNTE_UPDATED: 'APUNTE_UPDATED',
  APUNTE_DELETED: 'APUNTE_DELETED',

  EVENTO_CREATED: 'EVENTO_CREATED',
  EVENTO_UPDATED: 'EVENTO_UPDATED',
  EVENTO_DATE_UPDATED: 'EVENTO_DATE_UPDATED',
  EVENTO_DELETED: 'EVENTO_DELETED',

  YEAR_CREATED: 'YEAR_CREATED',
  YEAR_UPDATED: 'YEAR_UPDATED',
  YEAR_DELETED: 'YEAR_DELETED',

  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',

  QUIZ_BANK_UPLOADED: 'QUIZ_BANK_UPLOADED',
  QUIZ_BANK_DELETED: 'QUIZ_BANK_DELETED',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]


export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AUDIT_ACTIONS.SUBJECT_CREATED]: 'Materia creada',
  [AUDIT_ACTIONS.SUBJECT_UPDATED]: 'Materia actualizada',
  [AUDIT_ACTIONS.SUBJECT_DELETED]: 'Materia eliminada',
  [AUDIT_ACTIONS.SUBJECT_DRIVE_UPDATED]: 'Drive de materia actualizado',
  [AUDIT_ACTIONS.SUBJECT_PLAYLIST_UPDATED]: 'Playlist actualizada',
  [AUDIT_ACTIONS.COMMISSION_CREATED]: 'Comisión creada',
  [AUDIT_ACTIONS.APUNTE_CREATED]: 'Apunte creado',
  [AUDIT_ACTIONS.APUNTE_UPDATED]: 'Apunte actualizado',
  [AUDIT_ACTIONS.APUNTE_DELETED]: 'Apunte eliminado',
  [AUDIT_ACTIONS.EVENTO_CREATED]: 'Evento creado',
  [AUDIT_ACTIONS.EVENTO_UPDATED]: 'Evento actualizado',
  [AUDIT_ACTIONS.EVENTO_DATE_UPDATED]: 'Fecha de evento modificada',
  [AUDIT_ACTIONS.EVENTO_DELETED]: 'Evento eliminado',
  [AUDIT_ACTIONS.YEAR_CREATED]: 'Año creado',
  [AUDIT_ACTIONS.YEAR_UPDATED]: 'Año actualizado',
  [AUDIT_ACTIONS.YEAR_DELETED]: 'Año eliminado',
  [AUDIT_ACTIONS.USER_CREATED]: 'Usuario creado',
  [AUDIT_ACTIONS.USER_UPDATED]: 'Usuario actualizado',
  [AUDIT_ACTIONS.QUIZ_BANK_UPLOADED]: 'Banco de preguntas subido',
  [AUDIT_ACTIONS.QUIZ_BANK_DELETED]: 'Banco de preguntas eliminado',
}

export type AuditEntityType =
  | 'subject'
  | 'commission'
  | 'apunte'
  | 'evento'
  | 'year'
  | 'user'
  | 'quizBank'

export type AuditDetail = Record<string, unknown>

export interface RecordAuditInput {
  userId: string
  action: AuditAction
  entityType?: AuditEntityType
  entityId?: string
  detail: AuditDetail
}

// Logueo best-effort: si falla, NO interrumpe la mutación principal.
// Cada acción administrativa debe llamar a este helper DESPUÉS del commit.
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        detail: input.detail as object,
      },
    })
  } catch (error) {
    console.error('[audit] failed to record entry', {
      action: input.action,
      entityId: input.entityId,
      error,
    })
  }
}
