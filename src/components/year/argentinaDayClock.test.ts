import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { startArgentinaDayClock } from './argentinaDayClock'

let stop: (() => void) | undefined
let page: EventTarget
let browser: EventTarget
beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-23T02:59:59.000Z') })
  page = new EventTarget()
  browser = new EventTarget()
  vi.stubGlobal('document', page)
  vi.stubGlobal('window', browser)
})
afterEach(() => {
  stop?.()
  stop = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
it('switches at Argentina midnight, not UTC midnight, and schedules the following midnight', () => {
  const update = vi.fn()
  stop = startArgentinaDayClock(update)
  expect(update).toHaveBeenLastCalledWith('2026-10-22')
  vi.advanceTimersByTime(1000)
  expect(update).toHaveBeenLastCalledWith('2026-10-23')
  expect(vi.getTimerCount()).toBe(1)
  vi.advanceTimersByTime(24 * 60 * 60 * 1000)
  expect(update).toHaveBeenLastCalledWith('2026-10-24')
})
it('catches up after background suspension on visibility/focus, and cleans up every listener/timer', () => {
  const update = vi.fn()
  stop = startArgentinaDayClock(update)
  vi.setSystemTime(new Date('2026-10-25T04:00:00.000Z'))
  page.dispatchEvent(new Event('visibilitychange'))
  expect(update).toHaveBeenLastCalledWith('2026-10-25')
  vi.setSystemTime(new Date('2026-10-26T04:00:00.000Z'))
  browser.dispatchEvent(new Event('focus'))
  expect(update).toHaveBeenLastCalledWith('2026-10-26')
  stop()
  update.mockClear()
  vi.advanceTimersByTime(48 * 60 * 60 * 1000)
  page.dispatchEvent(new Event('visibilitychange'))
  browser.dispatchEvent(new Event('focus'))
  expect(update).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})
