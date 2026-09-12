import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MobileCalendar, type MobileCalendarEvent } from './MobileCalendar'

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-11T12:00:00Z') })
})

afterAll(() => {
  vi.useRealTimers()
})

vi.mock('@/components/admin/AdminControls', () => ({
  AdminControls: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./MobileEventDetailSheet', () => ({
  MobileEventDetailSheet: () => null,
}))

describe('MobileCalendar', () => {
  const eventsInJune: MobileCalendarEvent[] = [
    {
      id: 'event-june-1',
      titulo: 'Parcial 1',
      fecha: '2026-06-15',
      hora: '18:00',
      descripcion: 'Primer examen parcial',
      tipo: 'Examen',
      tipoId: 'tipo-1',
      materiaNombre: 'Sistemas Operativos',
      subjectSlug: 'sistemas-operativos',
    },
    {
      id: 'event-july-1',
      titulo: 'Recuperatorio',
      fecha: '2026-07-02',
      hora: '18:00',
      descripcion: 'Recuperatorio',
      tipo: 'Examen',
      tipoId: 'tipo-1',
      materiaNombre: 'Sistemas Operativos',
      subjectSlug: 'sistemas-operativos',
    },
  ]

  it('abre en el mes actual aunque la materia tenga sus primeros eventos en junio o julio', () => {
    const markup = renderToStaticMarkup(
      <MobileCalendar
        events={eventsInJune}
        accent="#3b82f6"
      />,
    )

    // El mes actual es Septiembre (2026-09-11)
    expect(markup).toContain('Septiembre')
    expect(markup).toContain('2026')
    // No debe abrirse en Junio por defecto
    expect(markup).not.toContain('Junio <span')
  })

  it('respeta initialDate cuando se le proporciona explícitamente', () => {
    const markup = renderToStaticMarkup(
      <MobileCalendar
        events={eventsInJune}
        accent="#3b82f6"
        initialDate="2026-06-15"
      />,
    )

    expect(markup).toContain('Junio')
    expect(markup).toContain('2026')
  })
})
