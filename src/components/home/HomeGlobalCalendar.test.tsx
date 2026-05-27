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
    fecha: new Date('2026-06-10T12:00:00.000Z'),
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
