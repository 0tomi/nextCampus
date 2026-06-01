import 'server-only'
import type { Prisma } from '../../prisma/generated/client/client'
import type { AdminUser } from '@/lib/auth'

export function auditLogScopeWhere(admin: AdminUser): Prisma.AuditLogWhereInput {
  if (admin.canManageAllYears) return {}
  return { yearId: { in: admin.yearIds } }
}

export function userHasScopedAuditWhere(admin: AdminUser): Prisma.UserAccountWhereInput {
  if (admin.canManageAllYears) return {}
  return {
    auditLogs: {
      some: {
        yearId: { in: admin.yearIds },
      },
    },
  }
}
