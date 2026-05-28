import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readApunteHtml } from '@/lib/storage'

const HTML_PREVIEW_CSP = [
  'sandbox',
  "default-src 'none'",
  "img-src https: data: blob:",
  "style-src 'unsafe-inline'",
  'font-src https: data:',
  "script-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join('; ')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recursoId: string }> },
) {
  const { recursoId } = await params

  const recurso = await prisma.apunteRecurso.findUnique({
    where: { id: recursoId },
    select: {
      tipo: true,
      storageKey: true,
    },
  })

  if (recurso?.tipo !== 'HTML' || !recurso.storageKey) {
    return new NextResponse('No encontrado', { status: 404 })
  }

  const html = await readApunteHtml(recurso.storageKey)
  if (html === null) {
    return new NextResponse('No encontrado', { status: 404 })
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': HTML_PREVIEW_CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
