import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApuntePdfUrl } from '@/lib/storage'

// Redirige a una URL firmada temporal del PDF (bucket privado). Lectura pública.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const apunte = await prisma.apunte.findUnique({ where: { id } })
  if (!apunte?.pdfObjectKey) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  const url = await getApuntePdfUrl(apunte.pdfObjectKey)
  if (!url) {
    return NextResponse.json(
      { error: 'No se pudo generar el enlace' },
      { status: 502 },
    )
  }
  return NextResponse.redirect(url)
}
