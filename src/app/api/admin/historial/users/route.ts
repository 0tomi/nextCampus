import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuditViewer } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasScopedAuditWhere } from '@/lib/audit-history-scope'

const querySchema = z.object({
  q: z.string().trim().max(120).default(''),
})

export async function GET(request: Request) {
  const admin = await requireAuditViewer()

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({ q: url.searchParams.get('q') ?? '' })
  if (!parsed.success) {
    return NextResponse.json({ users: [] })
  }

  const q = parsed.data.q
  const users = await prisma.userAccount.findMany({
    where: {
      ...userHasScopedAuditWhere(admin),
      ...(q ? { email: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { email: 'asc' },
    take: 12,
    select: { id: true, email: true },
  })

  return NextResponse.json({ users })
}
