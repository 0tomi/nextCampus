import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSubjectQuizMeta } from '@/lib/queries'
import { listQuizBanks, readQuizBanks } from '@/lib/storage'
import { buildSet, flattenBank, toPublicQuestion } from '@/lib/domain/quiz-bank'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  subject: z.string().min(1),
  banks: z.string().min(1), // ids separados por coma
  mode: z.enum(['practica', 'examen', 'general']).default('general'),
  count: z.coerce.number().int().min(0).max(500).default(0),
  units: z.string().optional(),
})

// Arma el set público (SIN answer ni explanation). El server lee los bancos
// elegidos desde Storage, los fusiona y mezcla según el modo.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }
  const { subject: subjectSlug, banks, mode, count, units } = parsed.data

  const subject = await getSubjectQuizMeta(subjectSlug)
  if (!subject) {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }

  // Solo se aceptan ids que existan en el manifest de ESTA materia.
  const manifest = await listQuizBanks(subject.year.slug, subject.slug)
  const allowed = new Set(manifest.map((b) => b.id))
  const requested = banks
    .split(',')
    .map((id) => id.trim())
    .filter((id) => allowed.has(id))

  if (requested.length === 0) {
    return NextResponse.json(
      { error: 'No hay bancos válidos seleccionados' },
      { status: 400 },
    )
  }

  const loaded = await readQuizBanks(
    subject.year.slug,
    subject.slug,
    requested,
  )

  let flat = requested.flatMap((bankId) => {
    const bank = loaded.get(bankId)
    return bank ? flattenBank(bankId, bank) : []
  })

  if (units) {
    const allowedUnits = new Set(units.split(',').map((u) => u.trim()))
    flat = flat.filter((q) => allowedUnits.has(q.unitName))
  }

  if (flat.length === 0) {
    return NextResponse.json(
      { error: 'Los bancos seleccionados no tienen preguntas o no coinciden con las unidades elegidas' },
      { status: 404 },
    )
  }

  const set = buildSet(flat, mode, count)
  return NextResponse.json({
    mode,
    total: set.length,
    preguntas: set.map(toPublicQuestion),
  })
}
