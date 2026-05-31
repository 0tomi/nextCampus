import { prisma } from '@/lib/prisma'
import { requireGeneralAdmin } from '@/lib/auth'
import { AUDIT_ACTION_LABELS, type AuditAction, type AuditDetail } from '@/lib/audit'
import { HistorialList, type HistorialEntry, type HistorialUserOption } from './HistorialList'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readParamList(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : []
  return [...new Set(values.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean))]
}

export default async function HistorialPage({ searchParams }: PageProps) {
  await requireGeneralAdmin()
  const resolved = await searchParams
  const selectedUserIds = readParamList(resolved.userId)
  const selectedActions = readParamList(resolved.action)

  const [rows, selectedUsers] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        ...(selectedUserIds.length > 0 ? { userId: { in: selectedUserIds } } : {}),
        ...(selectedActions.length > 0 ? { action: { in: selectedActions } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      include: { user: { select: { email: true } } },
    }),
    selectedUserIds.length > 0
      ? prisma.userAccount.findMany({
          where: { id: { in: selectedUserIds } },
          select: { id: true, email: true },
          orderBy: { email: 'asc' },
        })
      : Promise.resolve([]),
  ])

  const entries: HistorialEntry[] = rows.slice(0, PAGE_SIZE).map((row) => ({
    id: row.id,
    action: row.action,
    detail: (row.detail ?? null) as AuditDetail | null,
    createdAt: row.createdAt.toISOString(),
    userEmail: row.user?.email ?? null,
    userId: row.userId,
  }))

  const actionOptions = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
    value: value as AuditAction,
    label,
  }))

  const initialUsers: HistorialUserOption[] = selectedUsers.map((user) => ({
    id: user.id,
    email: user.email,
  }))

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-200/70">Auditoría</p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white">Historial de movimientos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
          Cada cambio que hace el equipo de administración queda registrado acá: quién lo hizo, qué cambió y cuándo.
        </p>
      </div>

      <HistorialList
        entries={entries}
        initialHasMore={rows.length > PAGE_SIZE}
        initialNextCursor={rows.length > PAGE_SIZE ? entries.at(-1)?.id ?? null : null}
        initialSelectedUsers={initialUsers}
        initialSelectedActions={selectedActions}
        actionOptions={actionOptions}
      />
    </div>
  )
}
