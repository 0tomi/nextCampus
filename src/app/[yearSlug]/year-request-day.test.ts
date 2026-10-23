import { afterEach, expect, it, vi } from 'vitest'

const gate = vi.hoisted(() => ({ connection: vi.fn() }))
vi.mock('next/server', () => ({ connection: gate.connection }))
import { getYearRequestDay } from './year-request-day'

afterEach(() => vi.useRealTimers())

it('waits for request time before calculating the initial SSR day, with no cached date dependency', async () => {
  vi.useFakeTimers({ now: new Date('2026-10-23T02:59:59.999Z') })
  let release!: () => void
  gate.connection.mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))
  const pending = getYearRequestDay()
  vi.setSystemTime(new Date('2026-10-23T03:00:00.000Z'))
  release()
  expect(await pending).toBe('2026-10-23')
  expect(gate.connection).toHaveBeenCalledOnce()
})
