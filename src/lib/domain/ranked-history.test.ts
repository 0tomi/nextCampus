import { describe, expect, it } from 'vitest'
import {
  getRankedHistoryTrendMessage,
  summarizeRankedHistory,
  type RankedHistoryAttempt,
} from './ranked-history'

function attempt(overrides: Partial<RankedHistoryAttempt>): RankedHistoryAttempt {
  return {
    correctAnswers: 8,
    totalQuestions: 10,
    percentage: 80,
    durationSeconds: 510,
    finishedAt: '2026-06-15T10:00:00.000Z',
    ...overrides,
  }
}

describe('summarizeRankedHistory', () => {
  it('devuelve estado vacío y mensaje sin historial cuando no hay intentos', () => {
    const summary = summarizeRankedHistory([])
    expect(summary).toEqual({
      totalAttempts: 0,
      bestPercentage: 0,
      bestDurationSeconds: 0,
      latestPercentage: 0,
      latestDurationSeconds: 0,
      changeVsPrevious: null,
      trend: 'empty',
    })
    expect(getRankedHistoryTrendMessage(summary)).toBe('Todavía no hay resultados válidos con este nombre.')
  })

  it('con un solo intento marca primer resultado sin comparación', () => {
    const summary = summarizeRankedHistory([attempt({ percentage: 70, durationSeconds: 600 })])
    expect(summary).toMatchObject({ totalAttempts: 1, bestPercentage: 70, latestPercentage: 70, changeVsPrevious: null, trend: 'first' })
    expect(getRankedHistoryTrendMessage(summary)).toBe('Este es tu primer resultado guardado en este banco.')
  })

  it('elige la mejor marca por porcentaje, luego menor duración y luego fecha', () => {
    const summary = summarizeRankedHistory([
      attempt({ percentage: 90, durationSeconds: 600, finishedAt: '2026-06-08T10:00:00.000Z' }),
      attempt({ percentage: 90, durationSeconds: 540, finishedAt: '2026-06-01T10:00:00.000Z' }),
      attempt({ percentage: 80, durationSeconds: 300, finishedAt: '2026-06-15T10:00:00.000Z' }),
    ])
    expect(summary?.bestPercentage).toBe(90)
    expect(summary?.bestDurationSeconds).toBe(540)
  })

  it('toma como último el de fecha más reciente y compara con el anterior (mejora)', () => {
    const summary = summarizeRankedHistory([
      attempt({ percentage: 70, finishedAt: '2026-06-01T10:00:00.000Z' }),
      attempt({ percentage: 90, finishedAt: '2026-06-15T10:00:00.000Z' }),
      attempt({ percentage: 80, finishedAt: '2026-06-08T10:00:00.000Z' }),
    ])
    expect(summary).toMatchObject({ latestPercentage: 90, changeVsPrevious: 10, trend: 'improved' })
    expect(getRankedHistoryTrendMessage(summary)).toBe('Mejoraste 10 puntos desde tu intento anterior.')
  })

  it('detecta retroceso contra el intento anterior', () => {
    const summary = summarizeRankedHistory([
      attempt({ percentage: 90, finishedAt: '2026-06-08T10:00:00.000Z' }),
      attempt({ percentage: 80, finishedAt: '2026-06-15T10:00:00.000Z' }),
    ])
    expect(summary).toMatchObject({ latestPercentage: 80, changeVsPrevious: -10, trend: 'declined' })
    expect(getRankedHistoryTrendMessage(summary)).toBe('Esta vez obtuviste 10 puntos menos. Podés volver a intentarlo.')
  })

  it('singulariza el copy cuando el cambio es de un punto', () => {
    const summary = summarizeRankedHistory([
      attempt({ percentage: 80, finishedAt: '2026-06-08T10:00:00.000Z' }),
      attempt({ percentage: 81, finishedAt: '2026-06-15T10:00:00.000Z' }),
    ])
    expect(getRankedHistoryTrendMessage(summary)).toBe('Mejoraste 1 punto desde tu intento anterior.')
  })

  it('marca empate cuando el último iguala al anterior', () => {
    const summary = summarizeRankedHistory([
      attempt({ percentage: 80, durationSeconds: 500, finishedAt: '2026-06-08T10:00:00.000Z' }),
      attempt({ percentage: 80, durationSeconds: 480, finishedAt: '2026-06-15T10:00:00.000Z' }),
    ])
    expect(summary).toMatchObject({ changeVsPrevious: 0, trend: 'equal' })
    expect(getRankedHistoryTrendMessage(summary)).toBe('Igualaste tu resultado anterior.')
  })
})
