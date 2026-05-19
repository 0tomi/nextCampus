import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSubjectQuizMeta } from '@/lib/queries'
import { listQuizBanks } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const querySchema = z.object({ subject: z.string().min(1) })

// Lista los bancos disponibles de una materia (desde el manifest). Lectura
// pública: SOLO metadata, nunca preguntas ni respuestas.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const subject = await getSubjectQuizMeta(parsed.data.subject)
  if (!subject) {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }

  const banks = await listQuizBanks(subject.year.slug, subject.slug)
  return NextResponse.json({
    bancos: banks.map((b) => ({
      id: b.id,
      nombre: b.nombre,
      totalPreguntas: b.totalPreguntas,
      subidoEl: b.subidoEl,
    })),
  })
}
