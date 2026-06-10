import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAnyAdmin, adminCanManageYear } from '@/lib/auth'


const querySchema = z.object({
  q: z.string().trim().max(120).default(''),
  yearId: z.string().trim().min(1).optional(),
  subjectId: z.string().trim().min(1).optional(),
})

export async function GET(request: Request) {
  const admin = await requireAnyAdmin()
  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    q: url.searchParams.get('q') ?? '',
    yearId: url.searchParams.get('yearId') ?? undefined,
    subjectId: url.searchParams.get('subjectId') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ items: [] }, { status: 400 })
  }

  const { q, yearId, subjectId } = parsed.data
  if (yearId && !adminCanManageYear(admin, yearId)) {
    return NextResponse.json({ items: [] }, { status: 403 })
  }

  const items = await prisma.apunte.findMany({
    where: {
      ...(q ? { titulo: { contains: q, mode: 'insensitive' } } : {}),
      ...(subjectId ? { subjectId } : {}),
      subject: {
        ...(yearId ? { yearId } : {}),
        ...(!admin.canManageAllYears ? { yearId: { in: admin.yearIds } } : {}),
      },
    },
    orderBy: [{ createdAt: 'desc' }, { titulo: 'asc' }],
    take: 12,
    select: {
      id: true,
      titulo: true,
      slug: true,
      subject: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          year: { select: { id: true, slug: true, nombre: true } },
        },
      },
    },
  })

  return NextResponse.json({ items })
}
