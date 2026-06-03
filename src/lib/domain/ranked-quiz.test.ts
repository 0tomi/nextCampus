import { describe, expect, it } from 'vitest'
import {
  OFFENSIVE_NAME_VARIATION_COUNT,
  getRankedQuestionCount,
  isRankedBankEligible,
  validateParticipantName,
} from './ranked-quiz'

describe('ranked quiz rules', () => {
  it('toma el 20% redondeado hacia arriba y exige mínimo 10', () => {
    expect(getRankedQuestionCount(49)).toBe(10)
    expect(getRankedQuestionCount(50)).toBe(10)
    expect(getRankedQuestionCount(51)).toBe(11)
    expect(isRankedBankEligible(45)).toBe(false)
    expect(isRankedBankEligible(46)).toBe(true)
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
})
