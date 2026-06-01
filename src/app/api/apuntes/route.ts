import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getApuntesPage } from '@/lib/queries'

const querySchema = z.object({
  subjectId: z.string().trim().min(1),
  cursor: z.string().trim().min(1).optional(),
  categoria: z.array(z.string().trim().min(1)).default([]),
})

function readRepeated(searchParams: URLSearchParams, key: string): string[] {
  return searchParams
    .getAll(key)
    .flatMap((value) =>
      value.split(',').flatMap((item) => {
        const trimmed = item.trim()
        return trimmed ? [trimmed] : []
      }),
    )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    subjectId: url.searchParams.get('subjectId') ?? '',
    cursor: url.searchParams.get('cursor') ?? undefined,
    categoria: readRepeated(url.searchParams, 'categoria'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'No pudimos cargar los apuntes con esos filtros.' },
      { status: 400 },
    )
  }

  const page = await getApuntesPage({
    subjectId: parsed.data.subjectId,
    cursor: parsed.data.cursor,
    categoriaIds: parsed.data.categoria,
  })

  return NextResponse.json(page)
}
