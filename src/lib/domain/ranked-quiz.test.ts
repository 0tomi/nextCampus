import { describe, expect, it } from 'vitest'
import {
  OFFENSIVE_NAME_VARIATION_COUNT,
  getRankedMaxDurationSeconds,
  getRankedQuestionCount,
  isRankedBankEligible,
  isRankedDurationExceeded,
  validateParticipantName,
} from './ranked-quiz'

describe('ranked quiz rules', () => {
  it('toma el porcentaje ranked y redondea hacia abajo a múltiplos de 5', () => {
    expect(getRankedQuestionCount(49)).toBe(5)
    expect(getRankedQuestionCount(50)).toBe(10)
    expect(getRankedQuestionCount(51)).toBe(10)
    expect(getRankedQuestionCount(260)).toBe(50)
    expect(getRankedQuestionCount(280)).toBe(55)
    expect(isRankedBankEligible(45)).toBe(false)
    expect(isRankedBankEligible(50)).toBe(true)
  })

  it('acepta nombres válidos y normaliza para agrupar ranking', () => {
    expect(validateParticipantName('  Juan Perez  ')).toEqual({
      ok: true,
      name: 'Juan Perez',
      normalizedName: 'juanperez',
    })
  })

  it('rechaza nombres ofensivos con separadores, tildes o leetspeak', () => {
    const badNames = [
      'boludo',
      'p e l o t u d o',
      'h.d.p',
      'hijo de puta',
      'm13rd4',
      'forro',
      'pajera',
      'tarado',
      'imbécil',
      'sorete',
    ]

    for (const name of badNames) {
      expect(validateParticipantName(name).ok, name).toBe(false)
    }
  })

  it('mantiene al menos 100 variaciones ofensivas cubiertas por regex', () => {
    expect(OFFENSIVE_NAME_VARIATION_COUNT).toBeGreaterThanOrEqual(100)
  })

  it('calcula el techo de duración según la cantidad de preguntas', () => {
    // 10 preguntas * 300s + 600s de margen = 3600s
    expect(getRankedMaxDurationSeconds(10)).toBe(3600)
  })

  it('no excede en el límite exacto y excede un segundo después', () => {
    expect(isRankedDurationExceeded(3600, 10)).toBe(false)
    expect(isRankedDurationExceeded(3601, 10)).toBe(true)
  })
})
