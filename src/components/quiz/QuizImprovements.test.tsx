import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialQuizState, type QuizState } from './quizReducer'
import { QuizRunningPhase } from './QuizRunningPhase'
import { QuizResultsPhase } from './QuizResultsPhase'
import type { QuizMode } from './quizTypes'

const context = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('./QuizProvider', () => ({ useQuiz: () => context.value }))
vi.mock('./RankedHistory', () => ({ RankedProgressCard: () => null }))
vi.mock('@/components/ui/AnimateIn', () => ({ AnimateIn: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/ui/AlertDialog', () => ({ AlertDialog: () => null }))

let state: QuizState
beforeEach(() => {
  state = { ...createInitialQuizState([]), phase: 'running', preguntas: [
    { id: 'a', type: 'multiple', question: 'First prompt', options: [{ id: 0, label: 'First option' }] },
    { id: 'b', type: 'single', question: 'Second prompt' },
    { id: 'c', type: 'single', question: 'Third prompt' },
    { id: 'd', type: 'single', question: 'Fourth prompt' },
  ] }
  context.value = { state, actions: {}, pregunta: state.preguntas[0], isPractica: true, isRanked: false }
})

describe('quiz presentation', () => {
  it('places the multiple-choice helper between the question and the options, including after verification', () => {
    for (const resultado of [undefined, { correcta: true, respuestaCorrecta: [0] }]) {
      context.value.resultado = resultado
      const markup = renderToStaticMarkup(<QuizRunningPhase />)
      expect(markup.indexOf('First prompt')).toBeLessThan(markup.indexOf('Puede haber más de una respuesta correcta.'))
      expect(markup.indexOf('Puede haber más de una respuesta correcta.')).toBeLessThan(markup.indexOf('First option'))
    }
  })

  it('shows a polite practice milestone notice, but never in ranked', () => {
    state.streakNotice = 5
    expect(renderToStaticMarkup(<QuizRunningPhase />)).toContain('¡Estás en racha de 5 preguntas correctas!')
    context.value.isPractica = false
    context.value.isRanked = true
    expect(renderToStaticMarkup(<QuizRunningPhase />)).not.toContain('Estás en racha')
  })

  it('renders ranked elapsed / existing maximum on the right', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100_000)
    state.rankedTiming = { elapsedAtSyncMs: 5000, syncedAtMs: 90_000 }
    context.value.isRanked = true
    const markup = renderToStaticMarkup(<QuizRunningPhase />)
    expect(markup).toContain('0:15 / 30:00')
    expect(markup).toContain('Tiempo transcurrido / máximo disponible')
    expect(markup).toContain('text-right')
    vi.restoreAllMocks()
  })

  it.each<QuizMode>(['practica', 'ranked', 'examen'])('orders wrong and unanswered questions first, retaining original numbers in %s', (mode) => {
    state.mode = mode
    state.phase = 'done'
    state.resultados = Object.fromEntries(['a', 'b', 'd'].map((id) => [id, { id, correcta: id !== 'b', unitName: 'Unit', explicacion: '', respuestaCorrecta: 0 }]))
    state.rankedSummary = { durationSeconds: 125, validForRanking: true, correctAnswers: 2, totalQuestions: 4, percentage: 50 }
    const markup = renderToStaticMarkup(<QuizResultsPhase />)
    const positions = ['Second prompt', 'Third prompt', 'First prompt', 'Fourth prompt'].map((prompt) => markup.indexOf(prompt))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    for (const [prompt, number] of [['Second prompt', 2], ['Third prompt', 3], ['First prompt', 1], ['Fourth prompt', 4]]) {
      expect(markup.slice(0, markup.indexOf(String(prompt)))).toMatch(new RegExp('>' + number + '</span><div[^>]*><p[^>]*>$'))
    }
    if (mode === 'ranked') expect(markup).toContain('2:05')
    else expect(markup).not.toContain('Tiempo total:')
  })
})
