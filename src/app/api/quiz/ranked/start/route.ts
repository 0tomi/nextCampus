import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSubjectQuizMeta } from '@/lib/queries'
import { buildSet, flattenBank, toPublicQuestion } from '@/lib/domain/quiz-bank'
import { getRankedQuestionCount, RANKED_MIN_QUESTIONS, validateParticipantName } from '@/lib/domain/ranked-quiz'
import { listQuizBanks, readQuizBank } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  subject: z.string().min(1),
  bankId: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
})

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

  const participant = validateParticipantName(parsed.data.name)
  if (!participant.ok) {
    return NextResponse.json({ error: participant.error }, { status: 400 })
  }

  const subject = await getSubjectQuizMeta(parsed.data.subject)
  if (!subject) {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }

  const manifest = await listQuizBanks(subject.year.slug, subject.slug)
  const bankMeta = manifest.find((bank) => bank.id === parsed.data.bankId)
  if (!bankMeta) {
    return NextResponse.json({ error: 'Banco no encontrado' }, { status: 404 })
  }

  const bank = await readQuizBank(subject.year.slug, subject.slug, bankMeta.id)
  if (!bank) {
    return NextResponse.json({ error: 'Banco no disponible' }, { status: 404 })
  }

  const flat = flattenBank(bankMeta.id, bank)
  const count = getRankedQuestionCount(flat.length)
  if (count < RANKED_MIN_QUESTIONS) {
    return NextResponse.json(
      { error: `Este banco necesita al menos ${RANKED_MIN_QUESTIONS} preguntas en ranked.` },
      { status: 400 },
    )
  }

  const set = buildSet(flat, 'ranked', count)
  const attempt = await prisma.rankedQuizAttempt.create({
    data: {
      subjectId: subject.id,
      bankId: bankMeta.id,
      bankName: bankMeta.nombre,
      participantName: participant.name,
      normalizedName: participant.normalizedName,
      questionIds: set.map((question) => question.id),
      totalQuestions: set.length,
    },
    select: { id: true },
  })

  return NextResponse.json({
    attemptId: attempt.id,
    mode: 'ranked',
    total: set.length,
    participantName: participant.name,
    preguntas: set.map(toPublicQuestion),
  })
}
