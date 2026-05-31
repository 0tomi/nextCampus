import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGeneralAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  q: z.string().trim().max(120).default(''),
})

export async function GET(request: Request) {
  await requireGeneralAdmin()

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({ q: url.searchParams.get('q') ?? '' })
  if (!parsed.success) {
    return NextResponse.json({ users: [] })
  }

  const q = parsed.data.q
  const users = await prisma.userAccount.findMany({
    where: q ? { email: { contains: q, mode: 'insensitive' } } : {},
    orderBy: { email: 'asc' },
    take: 12,
    select: { id: true, email: true },
  })

  return NextResponse.json({ users })
}
