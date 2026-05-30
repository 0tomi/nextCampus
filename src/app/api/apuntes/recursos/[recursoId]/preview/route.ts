import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readApunteHtml } from '@/lib/storage'

// Apuntes interactivos suben SOLO admins y se sirven desde este mismo origen,
// pero el sandbox SIN allow-same-origin fuerza un origen opaco: el iframe no
// puede leer cookies, storage ni el DOM del campus. El permiso mínimo para no
// romper React/calculadoras es ejecutar scripts; popups, downloads, forms y
// navegación superior quedan bloqueados por defecto.
const HTML_PREVIEW_CSP = [
  // allow-scripts habilita JS; NO incluir allow-same-origin (rompería el aislamiento).
  'sandbox allow-scripts',
  "default-src 'none'",
  // 'unsafe-inline' para el script del artifact; https://esm.sh para React (import map).
  "script-src 'unsafe-inline' https://esm.sh",
  "style-src 'unsafe-inline'",
  "img-src https: data: blob:",
  "font-src https: data:",
  // Los ESM imports a esm.sh necesitan connect-src para la negociación de módulos.
  "connect-src https://esm.sh",
  "media-src https: data: blob:",
  "worker-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
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
