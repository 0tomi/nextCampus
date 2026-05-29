import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { HomeGlobalCalendarEvent } from './HomeGlobalCalendar'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/components/calendar/EventCalendar', () => ({
  EventCalendar: () => null,
}))

function makeEvent(
  overrides: Partial<HomeGlobalCalendarEvent> = {},
): HomeGlobalCalendarEvent {
  return {
    id: 'event-1',
    titulo: 'Primer parcial',
    fecha: '2026-06-10',
    hora: '09:00',
    tipo: 'Parcial',
    tipoId: 'tipo-1',
    yearSlug: 'primer-anio',
    yearNombre: 'Primer año',
    subjectSlug: 'calculo',
    subjectId: 'subject-1',
    materiaNombre: 'Cálculo',
    descripcionHtml: '<p>Temas 1 y 2</p>',
    commissionSlug: 'comision-a',
    commissionNombre: 'Comisión A',
    ...overrides,
  }
}

describe('HomeGlobalCalendar', () => {
  it('muestra el año y hace navegable toda la card cuando hay comisión', async () => {
    const { HomeGlobalCalendar } = await import('./HomeGlobalCalendar')

    const markup = renderToStaticMarkup(
      <HomeGlobalCalendar
        initialPrefs={{ hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [] }}
        events={[makeEvent()]}
      />,
    )

    expect(markup).toContain('Primer año')
    expect(markup).toContain('href="/primer-anio/calculo/comision-a"')
    expect(markup).toContain('aria-label="Abrir Cálculo"')
  })

  it('arma la navegación base sin comisión y sigue mostrando el año', async () => {
    const { HomeGlobalCalendar } = await import('./HomeGlobalCalendar')

    const markup = renderToStaticMarkup(
      <HomeGlobalCalendar
        initialPrefs={{ hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [] }}
        events={[
          makeEvent({
            id: 'event-2',
            commissionSlug: null,
            commissionNombre: null,
          }),
        ]}
      />,
    )

    expect(markup).toContain('Primer año')
    expect(markup).toContain('href="/primer-anio/calculo"')
  })

  it('renderiza el día calendario sin correrlo por zona horaria', async () => {
    const { HomeGlobalCalendar } = await import('./HomeGlobalCalendar')

    const markup = renderToStaticMarkup(
      <HomeGlobalCalendar
        initialPrefs={{ hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [] }}
        events={[makeEvent({ fecha: '2026-06-10', hora: '09:00' })]}
      />,
    )

    // El evento es del 10; nunca debe verse como 9 (trampa de new Date("YYYY-MM-DD")).
    expect(markup).toContain('10 de jun')
    expect(markup).not.toContain('9 de jun')
    expect(markup).toContain('09:00')
  })

  it('omite la hora cuando el evento no la tiene', async () => {
    const { HomeGlobalCalendar } = await import('./HomeGlobalCalendar')

    const markup = renderToStaticMarkup(
      <HomeGlobalCalendar
        initialPrefs={{ hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [] }}
        events={[makeEvent({ fecha: '2026-06-10', hora: null })]}
      />,
    )

    expect(markup).toContain('10 de jun')
    expect(markup).not.toContain(' · ')
  })

  it('mantiene el filtro de preferencias para comisiones ocultas', async () => {
    const { HomeGlobalCalendar } = await import('./HomeGlobalCalendar')

    const markup = renderToStaticMarkup(
      <HomeGlobalCalendar
        initialPrefs={{
          hiddenYears: [],
          hiddenSubjects: [],
          hiddenCommissions: ['calculo:comision-a'],
        }}
        events={[makeEvent()]}
      />,
    )

    expect(markup).toContain('No hay eventos próximos en tu agenda.')
    expect(markup).not.toContain('Primer parcial')
  })
})
