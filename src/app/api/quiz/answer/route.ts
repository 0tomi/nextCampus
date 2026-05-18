import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPreguntaById } from '@/lib/queries'
import { corregir } from '@/lib/domain/quiz'

const bodySchema = z.object({
  preguntaId: z.string().min(1),
  userAnswer: z.string().max(2000),
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
