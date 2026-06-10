import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSubjectQuizMeta } from '@/lib/queries'
import { RANKED_TOP_LIMIT } from '@/lib/domain/ranked-quiz'


const querySchema = z.object({
  subject: z.string().min(1),
  bank: z.string().min(1).max(100),
})

type RankedRow = {
  participantName: string
  correctAnswers: number
  totalQuestions: number
  percentage: number
  durationSeconds: number
  finishedAt: Date
}

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

  const rows = await prisma.$queryRaw<RankedRow[]>`
    WITH best_attempts AS (
      SELECT
        "participantName",
        "correctAnswers",
        "totalQuestions",
        "percentage",
        "durationSeconds",
        "finishedAt",
        row_number() OVER (
          PARTITION BY "normalizedName"
          ORDER BY "percentage" DESC, "durationSeconds" ASC, "finishedAt" DESC
        ) AS rn
      FROM "RankedQuizAttempt"
      WHERE "subjectId" = ${subject.id}
        AND "bankId" = ${parsed.data.bank}
        AND "status" = 'VALID'
        AND "finishedAt" IS NOT NULL
        AND "percentage" IS NOT NULL
        AND "durationSeconds" IS NOT NULL
    )
    SELECT "participantName", "correctAnswers", "totalQuestions", "percentage", "durationSeconds", "finishedAt"
    FROM best_attempts
    WHERE rn = 1
    ORDER BY "percentage" DESC, "durationSeconds" ASC, "finishedAt" DESC
    LIMIT ${RANKED_TOP_LIMIT};
  `

  return NextResponse.json({
    items: rows.map((row, index) => ({
      position: index + 1,
      participantName: row.participantName,
      correctAnswers: row.correctAnswers,
      totalQuestions: row.totalQuestions,
      percentage: row.percentage,
      durationSeconds: row.durationSeconds,
      finishedAt: row.finishedAt.toISOString(),
    })),
  })
}
