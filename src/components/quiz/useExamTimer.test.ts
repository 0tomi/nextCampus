import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startExamCountdown } from './useExamTimer'
import { createInitialQuizState, quizReducer } from './quizReducer'

describe('exam countdown', () => {
  let cleanup: (() => void) | undefined
  let page: EventTarget
  let browser: EventTarget

  beforeEach(() => {
    vi.useFakeTimers({ now: 0 })
    page = new EventTarget()
    browser = new EventTarget()
    vi.stubGlobal('document', page)
    vi.stubGlobal('window', browser)
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('catches up after background suspension and expires only once on resume', () => {
    const onTick = vi.fn()
    const onExpire = vi.fn()
    cleanup = startExamCountdown(60_000, onTick, onExpire)
    vi.setSystemTime(45_500)
    page.dispatchEvent(new Event('visibilitychange'))
    expect(onTick).toHaveBeenLastCalledWith(15)
    vi.setSystemTime(65_000)
    browser.dispatchEvent(new Event('focus'))
    page.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(5000)
    expect(onTick).toHaveBeenLastCalledWith(0)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('uses elapsed time when a delayed timer runs, without a resume event', () => {
    const onTick = vi.fn()
    const onExpire = vi.fn()
    cleanup = startExamCountdown(60_000, onTick, onExpire)
    vi.setSystemTime(58_500)
    vi.advanceTimersByTime(1000)
    expect(onTick).toHaveBeenLastCalledWith(1)
    vi.advanceTimersByTime(1000)
    expect(onTick).toHaveBeenLastCalledWith(0)
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('cancels old sessions and starts a fresh deadline after reset', () => {
    const oldExpire = vi.fn()
    const oldTick = vi.fn()
    cleanup = startExamCountdown(1000, oldTick, oldExpire)
    cleanup()
    const newTick = vi.fn()
    const newExpire = vi.fn()
    cleanup = startExamCountdown(5000, newTick, newExpire)
    vi.advanceTimersByTime(1000)
    browser.dispatchEvent(new Event('focus'))
    expect(oldTick).toHaveBeenCalledTimes(1)
    expect(oldExpire).not.toHaveBeenCalled()
    expect(newTick).toHaveBeenLastCalledWith(4)
    vi.advanceTimersByTime(4000)
    expect(newExpire).toHaveBeenCalledOnce()
  })

  it('immediately expires an already elapsed deadline without negative seconds', () => {
    vi.setSystemTime(2000)
    const onTick = vi.fn()
    const onExpire = vi.fn()
    cleanup = startExamCountdown(1000, onTick, onExpire)
    expect(onTick).toHaveBeenCalledWith(0)
    expect(onExpire).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('preserves the deadline while answering and navigating, and rejects old ticks', () => {
    let state = quizReducer(createInitialQuizState([]), {
      type: 'START_SUCCESS', preguntas: [], timeLeft: 60, examDeadline: 60_000,
    })
    state = quizReducer(state, { type: 'SET_ANSWER', questionId: 'q1', answer: 0 })
    state = quizReducer(state, { type: 'NEXT_INDEX' })
    state = quizReducer(state, { type: 'PREV_INDEX' })
    expect(state.examDeadline).toBe(60_000)
    state = quizReducer(state, { type: 'TICK', timeLeft: 12, examDeadline: 60_000 })
    expect(state.timeLeft).toBe(12)
    state = quizReducer(state, { type: 'RESET' })
    expect(state.examDeadline).toBeNull()
    state = quizReducer(state, {
      type: 'START_SUCCESS', preguntas: [], timeLeft: 120, examDeadline: 180_000,
    })
    expect(quizReducer(state, { type: 'TICK', timeLeft: 0, examDeadline: 60_000 })).toBe(state)
    expect(state.timeLeft).toBe(120)
  })
})
