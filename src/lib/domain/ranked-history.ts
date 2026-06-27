// Dominio puro del progreso personal de Ranked. No conoce Prisma, fetch ni
// React: recibe los intentos válidos de una persona y deriva mejor marca,
// último intento, cambio contra el anterior y un mensaje de tendencia listo
// para mostrar. Mantener acá la regla evita una segunda consulta y deja todo
// fácil de testear.

export const RANKED_HISTORY_LIMIT = 20

export type RankedHistoryAttempt = {
  correctAnswers: number
  totalQuestions: number
  percentage: number
  durationSeconds: number
  finishedAt: string
}

export type RankedHistoryTrend = 'improved' | 'declined' | 'equal' | 'first' | 'empty'

export type RankedHistorySummary = {
  totalAttempts: number
  bestPercentage: number
  bestDurationSeconds: number
  latestPercentage: number
  latestDurationSeconds: number
  /** Diferencia de puntos contra el intento inmediatamente anterior. Null si es el primero. */
  changeVsPrevious: number | null
  trend: RankedHistoryTrend
}

function finishedTime(attempt: RankedHistoryAttempt): number {
  return new Date(attempt.finishedAt).getTime()
}

// Mejor: mayor porcentaje, luego menor duración, luego más reciente. Es el
// mismo criterio con el que el ranking elige la marca representativa de cada
// nombre, así "tu mejor marca" coincide con la que compite en el top.
function compareBest(a: RankedHistoryAttempt, b: RankedHistoryAttempt): number {
  return b.percentage - a.percentage || a.durationSeconds - b.durationSeconds || finishedTime(b) - finishedTime(a)
}

function compareLatest(a: RankedHistoryAttempt, b: RankedHistoryAttempt): number {
  return finishedTime(b) - finishedTime(a)
}

export function summarizeRankedHistory(attempts: RankedHistoryAttempt[]): RankedHistorySummary | null {
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      bestPercentage: 0,
      bestDurationSeconds: 0,
      latestPercentage: 0,
      latestDurationSeconds: 0,
      changeVsPrevious: null,
      trend: 'empty',
    }
  }

  const byLatest = attempts.toSorted(compareLatest)
  const best = attempts.toSorted(compareBest)[0]
  const latest = byLatest[0]
  const previous = byLatest[1]

  const changeVsPrevious = previous ? latest.percentage - previous.percentage : null

  return {
    totalAttempts: attempts.length,
    bestPercentage: best.percentage,
    bestDurationSeconds: best.durationSeconds,
    latestPercentage: latest.percentage,
    latestDurationSeconds: latest.durationSeconds,
    changeVsPrevious,
    trend: resolveTrend(changeVsPrevious),
  }
}

function resolveTrend(changeVsPrevious: number | null): RankedHistoryTrend {
  if (changeVsPrevious === null) return 'first'
  if (changeVsPrevious > 0) return 'improved'
  if (changeVsPrevious < 0) return 'declined'
  return 'equal'
}

function puntos(value: number): string {
  return value === 1 ? 'punto' : 'puntos'
}

// Copy de cara al usuario, sin tecnicismos. Espeja los textos del diseño.
export function getRankedHistoryTrendMessage(summary: RankedHistorySummary | null): string {
  if (!summary || summary.trend === 'empty') {
    return 'Todavía no hay resultados válidos con este nombre.'
  }
  if (summary.trend === 'first') {
    return 'Este es tu primer resultado guardado en este banco.'
  }
  if (summary.trend === 'equal') {
    return 'Igualaste tu resultado anterior.'
  }

  const delta = Math.abs(summary.changeVsPrevious ?? 0)
  if (summary.trend === 'improved') {
    return `Mejoraste ${delta} ${puntos(delta)} desde tu intento anterior.`
  }
  return `Esta vez obtuviste ${delta} ${puntos(delta)} menos. Podés volver a intentarlo.`
}
