import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSubjectQuizMeta } from '@/lib/queries'
import { cleanParticipantName, getNormalizedParticipantName } from '@/lib/domain/ranked-quiz'
import {
  getRankedHistoryTrendMessage,
  RANKED_HISTORY_LIMIT,
  summarizeRankedHistory,
  type RankedHistoryAttempt,
} from '@/lib/domain/ranked-history'

// El rate limit lo aplica el proxy a todo /api (60 req/min por IP, ver
// src/proxy.ts), así que esta ruta ya queda protegida contra enumeración
// automatizada sin sumar un limitador extra.

const querySchema = z.object({
  subject: z.string().min(1),
  bank: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
})

type HistoryRow = {
  participantName: string
  correctAnswers: number
  totalQuestions: number
  percentage: number
  durationSeconds: number
  finishedAt: Date
}

type PositionRow = { position: bigint }

function emptyResponse(participantName: string) {
  const summary = summarizeRankedHistory([])
  return NextResponse.json({
    participantName,
    summary: { ...summary, position: null, message: getRankedHistoryTrendMessage(summary) },
    attempts: [],
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const displayName = cleanParticipantName(parsed.data.name)
  const normalizedName = getNormalizedParticipantName(parsed.data.name)
  if (!normalizedName) {
    return emptyResponse(displayName)
  }

  const subject = await getSubjectQuizMeta(parsed.data.subject)
  if (!subject) {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }

  // Historial completo de la persona (es chico, va por-nombre) + posición en el
  // top: independientes, se piden en paralelo. El resumen se deriva sobre TODO
  // el historial; recién al responder se recorta la lista visible.
  const [rows, positionRows] = await Promise.all([
    prisma.$queryRaw<HistoryRow[]>`
      SELECT "participantName", "correctAnswers", "totalQuestions", "percentage", "durationSeconds", "finishedAt"
      FROM "RankedQuizAttempt"
      WHERE "subjectId" = ${subject.id}
        AND "bankId" = ${parsed.data.bank}
        AND "normalizedName" = ${normalizedName}
        AND "status" = 'VALID'
        AND "finishedAt" IS NOT NULL
        AND "percentage" IS NOT NULL
        AND "durationSeconds" IS NOT NULL
      ORDER BY "finishedAt" DESC;
    `,
    prisma.$queryRaw<PositionRow[]>`
      WITH best_attempts AS (
        SELECT
          "normalizedName",
          "percentage",
          "durationSeconds",
          "finishedAt",
          row_number() OVER (
            PARTITION BY "normalizedName"
            ORDER BY "percentage" DESC, "durationSeconds" ASC, "finishedAt" DESC
          ) AS personal_rank
        FROM "RankedQuizAttempt"
        WHERE "subjectId" = ${subject.id}
          AND "bankId" = ${parsed.data.bank}
          AND "status" = 'VALID'
          AND "finishedAt" IS NOT NULL
          AND "percentage" IS NOT NULL
          AND "durationSeconds" IS NOT NULL
      ),
      leaderboard AS (
        SELECT
          "normalizedName",
          row_number() OVER (
            ORDER BY "percentage" DESC, "durationSeconds" ASC, "finishedAt" DESC
          ) AS position
        FROM best_attempts
        WHERE personal_rank = 1
      )
      SELECT position FROM leaderboard WHERE "normalizedName" = ${normalizedName};
    `,
  ])

  if (rows.length === 0) {
    return emptyResponse(displayName)
  }

  const attempts: RankedHistoryAttempt[] = rows.map((row) => ({
    correctAnswers: row.correctAnswers,
    totalQuestions: row.totalQuestions,
    percentage: row.percentage,
    durationSeconds: row.durationSeconds,
    finishedAt: row.finishedAt.toISOString(),
  }))

  const summary = summarizeRankedHistory(attempts)
  const position = positionRows.length > 0 ? Number(positionRows[0].position) : null

  return NextResponse.json({
    participantName: rows[0].participantName,
    summary: { ...summary, position, message: getRankedHistoryTrendMessage(summary) },
    attempts: attempts.slice(0, RANKED_HISTORY_LIMIT),
  })
}
