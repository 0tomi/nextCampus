import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSubjectQuizMeta } from '@/lib/queries'
import { getQuestionFromBank, gradeQuestion, parseQuestionId, resumirIntento, type GradeResult, type QuizBankFile } from '@/lib/domain/quiz-bank'
import { readQuizBank } from '@/lib/storage'


const userAnswerSchema = z.union([
  z.number().int(),
  z.array(z.number().int()).max(20),
  z.boolean(),
  z.null(),
])

const bodySchema = z.object({
  subject: z.string().min(1),
  attemptId: z.string().min(1).max(100),
  answers: z.array(z.object({ id: z.string().min(1).max(200), answer: userAnswerSchema })).max(500),
  clientInvalidated: z.boolean().optional(),
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

  const subject = await getSubjectQuizMeta(parsed.data.subject)
  if (!subject) {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }

  const attempt = await prisma.rankedQuizAttempt.findFirst({
    where: { id: parsed.data.attemptId, subjectId: subject.id },
  })
  if (!attempt) {
    return NextResponse.json({ error: 'Intento no encontrado' }, { status: 404 })
  }
  if (attempt.finishedAt) {
    return NextResponse.json({ error: 'Este intento ya fue entregado' }, { status: 409 })
  }

  const checkedAttempt = attempt
  const allowedIds = new Set(attempt.questionIds)
  const answers = new Map(parsed.data.answers.filter((answer) => allowedIds.has(answer.id)).map((answer) => [answer.id, answer.answer]))
  const bankCache = new Map<string, QuizBankFile | null>()

  async function loadBank(bankId: string): Promise<QuizBankFile | null> {
    if (bankCache.has(bankId)) return bankCache.get(bankId) ?? null
    const bank = bankId === checkedAttempt.bankId ? await readQuizBank(subject!.year.slug, subject!.slug, bankId) : null
    bankCache.set(bankId, bank)
    return bank
  }

  const resultados: GradeResult[] = []
  for (const id of attempt.questionIds) {
    const loc = parseQuestionId(id)
    if (!loc || loc.bankId !== checkedAttempt.bankId) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }

    const bank = await loadBank(loc.bankId)
    const question = bank ? getQuestionFromBank(bank, loc.unitIdx, loc.qIdx) : null
    if (!bank || !question) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }

    resultados.push(gradeQuestion(id, bank.units[loc.unitIdx]?.name ?? '', question, answers.get(id) ?? null))
  }

  const resumen = resumirIntento(resultados)
  const finishedAt = new Date()
  const durationSeconds = Math.max(0, Math.round((finishedAt.getTime() - attempt.startedAt.getTime()) / 1000))
  const validForRanking = !attempt.invalidatedAt && parsed.data.clientInvalidated !== true

  await prisma.rankedQuizAttempt.update({
    where: { id: attempt.id },
    data: {
      status: validForRanking ? 'VALID' : 'INVALID',
      correctAnswers: resumen.correctas,
      percentage: resumen.porcentaje,
      durationSeconds,
      finishedAt,
      invalidReason: validForRanking ? attempt.invalidReason : attempt.invalidReason ?? 'client_invalidated',
      invalidatedAt: validForRanking ? attempt.invalidatedAt : attempt.invalidatedAt ?? finishedAt,
    },
  })

  return NextResponse.json({
    resultados,
    ranked: {
      validForRanking,
      invalidReason: validForRanking ? null : attempt.invalidReason ?? 'client_invalidated',
      correctAnswers: resumen.correctas,
      totalQuestions: resumen.total,
      percentage: resumen.porcentaje,
      durationSeconds,
    },
  })
}
