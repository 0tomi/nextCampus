import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPreguntaById, getPreguntasByIds } from '@/lib/queries'
import { corregir } from '@/lib/domain/quiz'

const bodySchema = z.object({
  preguntaId: z.string().min(1),
  userAnswer: z.string().max(2000),
})

const batchBodySchema = z.object({
  answers: z
    .array(
      z.object({
        preguntaId: z.string().min(1),
        userAnswer: z.string().max(2000),
      }),
    )
    .min(1)
    .max(200),
})

// Corrección server-side. Recibe la respuesta y devuelve si es correcta + la
// explicación. La respuesta correcta NO viaja antes de que el usuario responda.
export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const batchParsed = batchBodySchema.safeParse(json)
  if (batchParsed.success) {
    const preguntas = await getPreguntasByIds(
      batchParsed.data.answers.map((answer) => answer.preguntaId),
    )
    const preguntasById = new Map(
      preguntas.map((pregunta) => [pregunta.id, pregunta]),
    )
    const resultados = batchParsed.data.answers.map((answer) => {
      const pregunta = preguntasById.get(answer.preguntaId)
      return pregunta ? corregir(pregunta, answer.userAnswer) : null
    })

    if (resultados.some((resultado) => resultado === null)) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 },
      )
    }

    return NextResponse.json({ resultados })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const pregunta = await getPreguntaById(parsed.data.preguntaId)
  if (!pregunta) {
    return NextResponse.json(
      { error: 'Pregunta no encontrada' },
      { status: 404 },
    )
  }

  return NextResponse.json(corregir(pregunta, parsed.data.userAnswer))
}
