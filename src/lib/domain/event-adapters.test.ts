import { describe, expect, it } from 'vitest'
import { getSubjectVisibleEvents, isUpcomingEvent, sortEventsByDateTime } from './event-adapters'

describe('event-adapters', () => {
  it('ordena por fecha y hora, dejando los eventos sin hora primero', () => {
    expect(
      sortEventsByDateTime([
        { id: 'late', fecha: '2026-06-11', hora: '10:00' },
        { id: 'with-hour', fecha: '2026-06-10', hora: '09:00' },
        { id: 'no-hour', fecha: '2026-06-10', hora: null },
      ]).map((event) => event.id),
    ).toEqual(['no-hour', 'with-hour', 'late'])
  })

  it('considera próximos los eventos de hoy y futuros', () => {
    expect(isUpcomingEvent({ fecha: '2026-06-04', hora: null }, '2026-06-04')).toBe(true)
    expect(isUpcomingEvent({ fecha: '2026-06-05', hora: null }, '2026-06-04')).toBe(true)
    expect(isUpcomingEvent({ fecha: '2026-06-03', hora: null }, '2026-06-04')).toBe(false)
  })

  it('aplana eventos visibles desde todas las agendas de una materia', () => {
    const subject = {
      agendas: [
        { eventos: [{ id: 'general' }] },
        { eventos: [{ id: 'commission' }] },
      ],
    }

    expect(getSubjectVisibleEvents(subject).map((event) => event.id)).toEqual([
      'general',
      'commission',
    ])
  })
})
