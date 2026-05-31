import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGeneralAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { AuditDetail } from '@/lib/audit-types'

const PAGE_SIZE = 20

const querySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  userId: z.array(z.string().trim().min(1)).default([]),
  action: z.array(z.string().trim().min(1)).default([]),
})

function readRepeated(searchParams: URLSearchParams, key: string): string[] {
  return searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

export async function GET(request: Request) {
  await requireGeneralAdmin()

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    cursor: url.searchParams.get('cursor') ?? undefined,
    userId: readRepeated(url.searchParams, 'userId'),
    action: readRepeated(url.searchParams, 'action'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'No pudimos cargar el historial con esos filtros.' },
      { status: 400 },
    )
  }

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(parsed.data.userId.length > 0 ? { userId: { in: parsed.data.userId } } : {}),
      ...(parsed.data.action.length > 0 ? { action: { in: parsed.data.action } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}),
    include: { user: { select: { email: true } } },
  })

  const items = rows.slice(0, PAGE_SIZE).map((row) => ({
    id: row.id,
    action: row.action,
    detail: (row.detail ?? null) as AuditDetail | null,
    createdAt: row.createdAt.toISOString(),
    userEmail: row.user?.email ?? null,
    userId: row.userId,
  }))

  return NextResponse.json({
    items,
    hasMore: rows.length > PAGE_SIZE,
    nextCursor: rows.length > PAGE_SIZE ? items.at(-1)?.id ?? null : null,
  })
}
