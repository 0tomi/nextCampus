import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { startRankedClock } from './rankedClock'

let cleanup: (() => void) | undefined
let page: EventTarget
let browser: EventTarget
beforeEach(() => {
  vi.useFakeTimers({ now: 100_000 })
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

it('uses the server elapsed anchor, includes ready time, and catches up after suspension', () => {
  const tick = vi.fn()
  cleanup = startRankedClock({ elapsedAtSyncMs: 5000, syncedAtMs: 90_000 }, tick)
  expect(tick).toHaveBeenLastCalledWith(15)
  vi.advanceTimersByTime(2000)
  expect(tick).toHaveBeenLastCalledWith(17)
  vi.setSystemTime(200_000)
  page.dispatchEvent(new Event('visibilitychange'))
  expect(tick).toHaveBeenLastCalledWith(115)
  vi.setSystemTime(210_000)
  browser.dispatchEvent(new Event('focus'))
  expect(tick).toHaveBeenLastCalledWith(125)
})

it('cleans up timer and resume listeners when leaving running phase; new sessions start fresh', () => {
  const oldTick = vi.fn()
  cleanup = startRankedClock({ elapsedAtSyncMs: 0, syncedAtMs: 100_000 }, oldTick)
  cleanup()
  expect(vi.getTimerCount()).toBe(0)
  const tick = vi.fn()
  cleanup = startRankedClock({ elapsedAtSyncMs: 2000, syncedAtMs: 100_000 }, tick)
  vi.advanceTimersByTime(1000)
  page.dispatchEvent(new Event('visibilitychange'))
  browser.dispatchEvent(new Event('focus'))
  expect(oldTick).toHaveBeenCalledOnce()
  expect(tick).toHaveBeenLastCalledWith(3)
})

it('keeps displaying elapsed time beyond the budget without introducing auto-submit', () => {
  const tick = vi.fn()
  cleanup = startRankedClock({ elapsedAtSyncMs: 3_700_000, syncedAtMs: 100_000 }, tick)
  expect(tick).toHaveBeenLastCalledWith(3700)
})
