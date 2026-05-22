import { prisma } from '@/lib/prisma'
import { requireGeneralAdmin } from '@/lib/auth'
import type { AuditDetail } from '@/lib/audit'
import { HistorialList, type HistorialEntry } from './HistorialList'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number.parseInt(value ?? '1', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return parsed
}

export default async function HistorialPage({ searchParams }: PageProps) {
  await requireGeneralAdmin()
  const resolved = await searchParams
  const requestedPage = parsePage(resolved.page)

  const totalCount = await prisma.auditLog.count()
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)

  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    include: {
      user: { select: { email: true } },
    },
  })

  const entries: HistorialEntry[] = rows.map((row) => ({
    id: row.id,
    action: row.action,
    detail: (row.detail ?? null) as AuditDetail | null,
    createdAt: row.createdAt,
    userEmail: row.user?.email ?? null,
  }))

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-200/70">Auditoría</p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white">Historial de movimientos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
          Cada cambio que hace el equipo de administración queda registrado acá: quién lo hizo, qué cambió y cuándo.
        </p>
      </div>

      <HistorialList
        entries={entries}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  )
}
