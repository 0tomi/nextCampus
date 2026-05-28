import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSubjectQuizMeta } from '@/lib/queries'
import { listQuizBanks, readQuizBank } from '@/lib/storage'
import {
  getQuestionFromBank,
  gradeQuestion,
  parseQuestionId,
  type GradeResult,
  type QuizBankFile,
} from '@/lib/domain/quiz-bank'

export const dynamic = 'force-dynamic'

const userAnswerSchema = z.union([
  z.number().int(),
  z.array(z.number().int()).max(20),
  z.boolean(),
  z.null(),
])

const bodySchema = z.object({
  subject: z.string().min(1),
  answers: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        answer: userAnswerSchema,
      }),
    )
    .min(1)
    .max(500),
})

// Corrección server-side. El cliente manda {id, answer}; el server RECARGA el
// banco correspondiente desde Storage y corrige. Las respuestas correctas
// nunca viajan antes de esto. Un id forjado no sirve: solo se corrige contra
// bancos que existan en el manifest de la materia.
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
  const { subject: subjectSlug, answers } = parsed.data

  const subject = await getSubjectQuizMeta(subjectSlug)
  if (!subject) {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }

  const manifest = await listQuizBanks(subject.year.slug, subject.slug)
  const allowed = new Set(manifest.map((b) => b.id))

  const bankCache = new Map<string, QuizBankFile | null>()
  async function loadBank(bankId: string): Promise<QuizBankFile | null> {
    if (bankCache.has(bankId)) return bankCache.get(bankId) ?? null
    const bank = allowed.has(bankId)
      ? await readQuizBank(subject!.year.slug, subject!.slug, bankId)
      : null
    bankCache.set(bankId, bank)
    return bank
  }

  const resultados: GradeResult[] = []
  for (const { id, answer } of answers) {
    const loc = parseQuestionId(id)
    if (!loc || !allowed.has(loc.bankId)) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 },
      )
    }
    const bank = await loadBank(loc.bankId)
    const question = bank
      ? getQuestionFromBank(bank, loc.unitIdx, loc.qIdx)
      : null
    if (!question) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 },
      )
    }
    const unitName = bank?.units[loc.unitIdx]?.name ?? ''
    resultados.push(gradeQuestion(id, unitName, question, answer))
  }

  return NextResponse.json({ resultados })
}
