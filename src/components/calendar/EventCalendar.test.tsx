import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { EventCalendarEvent } from './EventCalendar'

vi.mock('@fullcalendar/react', () => ({
  default: ({
    customButtons,
  }: {
    customButtons?: {
      customPrev?: { text: string }
      customNext?: { text: string }
      customToday?: { text: string }
    }
  }) => (
    <div data-testid="fullcalendar-stub">
      <div className="fc-header-toolbar">
        <span>{customButtons?.customPrev?.text}</span>
        <span>{customButtons?.customNext?.text}</span>
        <span>{customButtons?.customToday?.text}</span>
      </div>
    </div>
  ),
}))

function makeCalendarEvent(overrides: Partial<EventCalendarEvent> = {}): EventCalendarEvent {
  return {
    id: 'ev-1',
    titulo: 'Clase Magistral',
    fecha: '2026-08-15',
    hora: '10:00',
    tipo: 'Clase',
    ...overrides,
  }
}

describe('EventCalendar', () => {
  it('renderiza el contenedor y estructura del calendario con controles de navegación', async () => {
    const { EventCalendar } = await import('./EventCalendar')

    const markup = renderToStaticMarkup(
      <EventCalendar
        events={[makeCalendarEvent()]}
        emptyMessage="Sin eventos cargados."
      />,
    )

    expect(markup).toContain('fc-header-toolbar')
    expect(markup).toContain('Hoy')
    expect(markup).toContain('←')
    expect(markup).toContain('→')
  })
})
