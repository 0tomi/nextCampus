import { describe, expect, it } from 'vitest'
import { QUIZ_BANK_JSON_EXAMPLE, QUIZ_BANK_JSON_FORMAT } from './quiz-bank-format'
import { LIMITS, parseQuizBank } from './quiz-bank'

describe('quiz bank format instructions', () => {
  it('provides a valid example covering every supported question type', () => {
    const result = parseQuizBank(JSON.stringify(QUIZ_BANK_JSON_EXAMPLE))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.totalPreguntas).toBe(3)
    expect(result.bank.units[0].questions.map((question) => question.type)).toEqual([
      'single', 'multiple', 'truefalse',
    ])
  })

  it('copies only the shared example and compatibility constraints', () => {
    expect(QUIZ_BANK_JSON_FORMAT).toContain(JSON.stringify(QUIZ_BANK_JSON_EXAMPLE, null, 2))
    expect(QUIZ_BANK_JSON_FORMAT).toContain(`máximo ${LIMITS.totalQuestions} preguntas`)
    expect(QUIZ_BANK_JSON_FORMAT).toContain(`hasta ${LIMITS.explanation} caracteres`)
    expect(QUIZ_BANK_JSON_FORMAT).toContain('2.097.152 caracteres, incluidos espacios y saltos de línea')
    expect(QUIZ_BANK_JSON_FORMAT).toContain('sin repetir')
    expect(QUIZ_BANK_JSON_FORMAT).toContain('texto opcional')
    expect(QUIZ_BANK_JSON_FORMAT).not.toContain('profesor universitario')
    expect(QUIZ_BANK_JSON_FORMAT).not.toContain('distractores)')
    expect(QUIZ_BANK_JSON_FORMAT).not.toContain('Cantidad por defecto')
  })
})
