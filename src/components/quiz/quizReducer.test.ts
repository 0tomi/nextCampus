import { describe, expect, it } from 'vitest'
import { createInitialQuizState, quizReducer, type QuizState } from './quizReducer'

const preguntas = Array.from({ length: 12 }, (_, index) => ({ id: String(index), type: 'single' as const, question: String(index) }))
const start = () => quizReducer(createInitialQuizState([]), { type: 'START_SUCCESS', preguntas, timeLeft: null, examDeadline: null })
const verify = (state: QuizState, correcta = true, id = preguntas[state.index].id) => quizReducer(state, {
  type: 'VERIFY_SUCCESS', resultado: { id, correcta, respuestaCorrecta: 1, explicacion: '', unitName: 'Unit' },
})
const next = (state: QuizState) => quizReducer(state, { type: 'NEXT_INDEX' })

describe('practice streak', () => {
  it('announces 3, 5, 7 consecutive correct answers and clears notices on navigation', () => {
    let state = start()
    for (let count = 1; count <= 7; count++) {
      state = verify(state)
      expect(state.practiceStreak).toBe(count)
      expect(state.streakNotice).toBe(count >= 3 && count % 2 === 1 ? count : null)
      state = next(state)
      expect(state.streakNotice).toBeNull()
    }
  })

  it('resets on errors and skipped unverified questions, then can reach another milestone', () => {
    let state = next(verify(next(verify(start()))))
    state = verify(state, false)
    expect(state.practiceStreak).toBe(0)
    state = next(state)
    for (let i = 0; i < 3; i++) state = next(verify(state))
    expect(state.practiceStreak).toBe(3)
    state = next(state)
    expect(state.practiceStreak).toBe(0)
    for (let i = 0; i < 3; i++) state = next(verify(state))
    expect(state.practiceStreak).toBe(3)
  })

  it('does not count duplicate corrections or revisiting old questions', () => {
    let state = verify(start())
    expect(verify(state)).toBe(state)
    const duplicateRequest = quizReducer(state, { type: 'VERIFY_REQUEST' })
    expect(verify(duplicateRequest)).toMatchObject({ practiceStreak: 1, loading: false })
    state = verify(next(state))
    state = quizReducer(state, { type: 'PREV_INDEX' })
    expect(verify(state)).toBe(state)
    state = next(next(state))
    expect(verify(state).practiceStreak).toBe(3)
  })

  it('clears streak state on reset/start and ignores late verification after finish', () => {
    let state = verify(start())
    state = quizReducer(state, { type: 'FINISH_SUCCESS', resultados: state.resultados })
    expect(verify(state)).toBe(state)
    state = quizReducer(state, { type: 'RESET' })
    expect(state.practiceStreak).toBe(0)
    expect(state.streakNotice).toBeNull()
    expect(verify(state, true, '0')).toBe(state)
  })
})

it('preserves server-anchored ranked timing across ready/entry/navigation and clears on reset', () => {
  const rankedTiming = { elapsedAtSyncMs: 3000, syncedAtMs: 10_000 }
  let state = quizReducer(createInitialQuizState([]), { type: 'RANKED_READY_SUCCESS', preguntas, rankedAttemptId: 'attempt', rankedName: 'Name', rankedTiming })
  expect(state.rankedTiming).toEqual(rankedTiming)
  state = quizReducer(state, { type: 'ENTER_RANKED_SUCCESS' })
  state = next(state)
  expect(state.rankedTiming).toEqual(rankedTiming)
  expect(quizReducer(state, { type: 'RESET' }).rankedTiming).toBeNull()
})
