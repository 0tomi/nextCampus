import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApuntePdfUrl } from '@/lib/storage'

// Acceso público (sin auth). URL firmada con TTL corto (5min) y no cacheable.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const apunte = await prisma.apunte.findUnique({ where: { id } })
  if (!apunte?.pdfObjectKey) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  const url = await getApuntePdfUrl(apunte.pdfObjectKey, 300)
  if (!url) {
    return NextResponse.json(
      { error: 'No se pudo generar el enlace' },
      { status: 502 },
    )
  }
  const res = NextResponse.redirect(url)
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
