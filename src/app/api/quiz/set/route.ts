import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPreguntasByUnidades, getSubjectBySlug } from '@/lib/queries'
import { buildQuizSet, toPreguntaPublica } from '@/lib/domain/quiz'

const querySchema = z.object({
  subject: z.string().min(1),
  mode: z.enum(['examen-tiempo', 'practica', 'general']).default('general'),
  count: z.coerce.number().int().min(0).max(200).default(0),
  unidades: z.string().optional(), // ids separados por coma
})

// Devuelve el set de preguntas SIN respuestaCorrecta ni explicación.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }
  const { subject: subjectSlug, mode, count, unidades } = parsed.data

  const subject = await getSubjectBySlug(subjectSlug)
  if (!subject) {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }

  const allUnidadIds = subject.quizUnidades.map((u) => u.id)
  const requested = unidades
    ? unidades.split(',').filter((id) => allUnidadIds.includes(id))
    : allUnidadIds
  const unidadIds = requested.length > 0 ? requested : allUnidadIds

  const preguntas = await getPreguntasByUnidades(unidadIds)
  const set = buildQuizSet(preguntas, mode, count)

  return NextResponse.json({
    mode,
    total: set.length,
    preguntas: set.map(toPreguntaPublica),
  })
}
