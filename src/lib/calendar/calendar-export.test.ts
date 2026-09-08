import { describe, expect, it } from 'vitest'
import { EMPTY_PREFERENCES, type UserPreferences } from '@/lib/preferences'
import {
  filterUpcomingCalendarEvents,
  filterYearCalendarEventsForUser,
} from './calendar-export'

type TestEvent = {
  id: string
  fecha: string
  subjectSlug: string
  commissionId: string | null
  commissionSlug: string | null
}

const event = (id: string, overrides: Partial<TestEvent> = {}): TestEvent => ({
  id,
  fecha: '2026-09-08',
  subjectSlug: 'matematica',
  commissionId: null,
  commissionSlug: null,
  ...overrides,
})

const prefs = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
  ...EMPTY_PREFERENCES,
  ...overrides,
})

describe('filterYearCalendarEventsForUser', () => {
  it('aplica año, materia, comisión oculta y comisión preferida sin mutar la entrada', () => {
    const events = [
      event('general'),
      event('preferred', { commissionId: 'c1', commissionSlug: 'manana' }),
      event('other', { commissionId: 'c2', commissionSlug: 'tarde' }),
      event('hidden', { subjectSlug: 'fisica' }),
    ]

    const result = filterYearCalendarEventsForUser({
      events,
      yearSlug: 'primero',
      prefs: prefs({ hiddenSubjects: ['fisica'], hiddenCommissions: ['matematica:tarde'] }),
      preferredBySubject: { matematica: 'c1' },
    })

    expect(result.map(({ id }) => id)).toEqual(['general', 'preferred'])
    expect(events.map(({ id }) => id)).toEqual(['general', 'preferred', 'other', 'hidden'])
  })

  it('excluye el año oculto y las comisiones específicas sin slug', () => {
    const events = [event('bad', { commissionId: 'c1', commissionSlug: null })]

    expect(filterYearCalendarEventsForUser({
      events,
      yearSlug: 'primero',
      prefs: prefs({ hiddenYears: ['primero'] }),
      preferredBySubject: {},
    })).toEqual([])

    expect(filterYearCalendarEventsForUser({
      events,
      yearSlug: 'primero',
      prefs: null,
      preferredBySubject: {},
    })).toEqual([])
  })

  it('incluye todas las comisiones cuando no hay preferencia y conserva generales', () => {
    const events = [
      event('general'),
      event('one', { commissionId: 'c1', commissionSlug: 'manana' }),
      event('two', { commissionId: 'c2', commissionSlug: 'tarde' }),
    ]

    expect(filterYearCalendarEventsForUser({
      events,
      yearSlug: 'primero',
      prefs: null,
      preferredBySubject: {},
    }).map(({ id }) => id)).toEqual(['general', 'one', 'two'])
  })
})

describe('filterUpcomingCalendarEvents', () => {
  it('incluye hoy aunque la hora haya pasado y excluye solo fechas anteriores', () => {
    const events = [
      event('yesterday', { fecha: '2026-09-07' }),
      event('today', { fecha: '2026-09-08' }),
      event('tomorrow', { fecha: '2026-09-09' }),
    ]

    expect(filterUpcomingCalendarEvents(events, '2026-09-08').map(({ id }) => id)).toEqual([
      'today',
      'tomorrow',
    ])
  })
})
