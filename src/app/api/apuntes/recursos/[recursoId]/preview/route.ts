import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readApunteHtml } from '@/lib/storage'

// Apuntes HTML suben SOLO admins (requireGeneralAdmin) y se sirven desde este
// mismo origen, pero el sandbox SIN allow-same-origin fuerza un origen opaco:
// el iframe no puede leer cookies, localStorage ni el DOM del campus.
// Por eso es seguro habilitar scripts/recursos externos acá: el aislamiento
// protege a la app aunque el HTML ejecute JS (MathJax, labs interactivos, etc.).
const HTML_PREVIEW_CSP = [
  // allow-scripts habilita JS; NO incluir allow-same-origin (rompería el aislamiento).
  'sandbox allow-scripts allow-popups allow-modals allow-forms allow-downloads',
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https:",
  "style-src 'unsafe-inline' https:",
  "img-src https: data: blob:",
  "font-src https: data:",
  "connect-src https: data: blob:",
  "media-src https: data: blob:",
  "worker-src https: blob:",
  "frame-src https:",
  "child-src https: blob:",
  "form-action https:",
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
