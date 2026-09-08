import { describe, expect, it } from 'vitest'
import { serializeCalendarToIcs } from './ics'

const baseEvent = (overrides: Partial<Parameters<typeof serializeCalendarToIcs>[0][number]> = {}) => ({
  id: 'event-1',
  titulo: 'Examen',
  tituloOriginal: 'Examen',
  fecha: '2026-02-28',
  hora: null,
  materiaNombre: 'Matemática',
  descripcion: 'Traer lápiz, regla; y\\borrador\nSegunda línea',
  commissionNombre: 'Comisión A',
  ...overrides,
})

describe('serializeCalendarToIcs', () => {
  it('genera un calendario vacío válido con VTIMEZONE y CRLF', () => {
    const ics = serializeCalendarToIcs([], {
      calendarName: 'NextCampus · Primero',
      generatedAt: new Date('2026-09-07T15:04:05.000Z'),
    })

    expect(ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(ics).toContain('PRODID:-//NextCampus//Calendario académico//ES\r\n')
    expect(ics).toContain('BEGIN:VTIMEZONE\r\n')
    expect(ics).not.toContain('BEGIN:VEVENT')
    expect(ics.endsWith('\r\n')).toBe(true)
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n')
  })

  it('serializa all-day con fin exclusivo y escapa texto', () => {
    const ics = serializeCalendarToIcs([baseEvent()], {
      calendarName: 'Calendario, Primero',
      generatedAt: new Date('2026-09-07T15:04:05.000Z'),
    })

    expect(ics).toContain('DTSTART;VALUE=DATE:20260228\r\n')
    expect(ics).toContain('DTEND;VALUE=DATE:20260301\r\n')
    expect(ics).toContain('DTSTAMP:20260907T150405Z\r\n')
    expect(ics).toContain('SUMMARY:Examen · Matemática · Comisión A\r\n')
    expect(ics).toContain('DESCRIPTION:Traer lápiz\\, regla\\; y\\\\borrador\\nSegunda línea\r\n')
    expect(ics).toContain('UID:nextcampus-event-1@calendar\r\n')
  })

  it('serializa eventos con hora en la zona académica sin inventar duración', () => {
    const ics = serializeCalendarToIcs([baseEvent({
      id: 'timed',
      fecha: '2026-03-01',
      hora: '09:30',
      descripcion: null,
    })], {
      calendarName: 'Primero',
      generatedAt: new Date('2026-09-07T00:00:00.000Z'),
    })

    expect(ics).toContain('DTSTART;TZID=America/Argentina/Buenos_Aires:20260301T093000\r\n')
    expect(ics).not.toContain('DTEND')
    expect(ics).not.toContain('DESCRIPTION')
  })

  it('ordena eventos y omite fechas u horas inválidas sin descartar los demás', () => {
    const ics = serializeCalendarToIcs([
      baseEvent({ id: 'z', fecha: '2026-03-03' }),
      baseEvent({ id: 'invalid-date', fecha: '2026-02-31' }),
      baseEvent({ id: 'a', fecha: '2026-03-02', hora: '08:00' }),
      baseEvent({ id: 'invalid-time', fecha: '2026-03-02', hora: '25:00' }),
    ], { calendarName: 'Primero', generatedAt: new Date('2026-09-07T00:00:00.000Z') })

    expect(ics).not.toContain('invalid-date')
    expect(ics).not.toContain('invalid-time')
    expect(ics.indexOf('UID:nextcampus-a@calendar')).toBeLessThan(ics.indexOf('UID:nextcampus-z@calendar'))
  })

  it('pliega líneas largas por bytes UTF-8 sin superar 75 octetos', () => {
    const ics = serializeCalendarToIcs([baseEvent({ descripcion: 'á'.repeat(100) })], {
      calendarName: 'Calendario',
      generatedAt: new Date('2026-09-07T00:00:00.000Z'),
    })

    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(ics).toContain('\r\n ')
  })
})
