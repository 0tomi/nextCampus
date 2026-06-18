import { NextResponse } from 'next/server'
import { apunteSearchQuerySchema, searchApuntes } from '@/lib/domain/apunte-search'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const parsed = apunteSearchQuerySchema.safeParse({ q })

  if (!parsed.success) {
    const message = q.length > 120
      ? 'Probá con una búsqueda más corta.'
      : 'Escribí al menos 2 caracteres.'

    return NextResponse.json(
      { error: message, items: [] },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const items = await searchApuntes(parsed.data)
    return NextResponse.json(
      { query: parsed.data.q, items },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { error: 'No pudimos buscar ahora. Probá de nuevo en unos segundos.', items: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
