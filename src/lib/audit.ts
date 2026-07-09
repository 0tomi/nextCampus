import { prisma } from '@/lib/prisma'
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  type AuditAction,
  type AuditDetail,
  type AuditEntityType,
} from '@/lib/audit-types'

export { AUDIT_ACTIONS, AUDIT_ACTION_LABELS }
export type { AuditAction, AuditDetail, AuditEntityType }

interface RecordAuditInput {
  userId: string
  action: AuditAction
  entityType?: AuditEntityType
  entityId?: string
  yearId?: string | null
  yearSlug?: string | null
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
        yearId: input.yearId ?? null,
        yearSlug: input.yearSlug ?? null,
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
