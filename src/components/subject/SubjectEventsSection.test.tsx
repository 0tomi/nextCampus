import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-08-21T12:00:00Z') })
})

afterAll(() => {
  vi.useRealTimers()
})

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
    refresh: vi.fn(),
  }),
}))

vi.mock('@/components/calendar/EventCalendarAdmin', () => ({
  EventCalendarAdmin: () => <div data-testid="mock-calendar-admin" />,
}))

vi.mock('@/components/admin/SubjectPageAdminOverlay', () => ({
  AdminTriggerButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DeleteEventoButton: () => null,
}))

vi.mock('@/components/admin/adminAccess', () => ({
  useAdminAccess: () => false,
}))

describe('SubjectEventsSection', () => {
  const baseSubject = {
    id: 'subj-1',
    slug: 'bases-de-datos',
    nombre: 'Bases de Datos',
    year: {
      id: 'year-2',
      slug: 'segundo-anio',
    },
  }

  const tiposEvento = [
    { id: 'tipo-1', nombre: 'Examen' },
    { id: 'tipo-2', nombre: 'Trabajo Práctico' },
  ]

  it('muestra "No hay eventos próximos para mostrar" cuando todos los eventos ya pasaron', async () => {
    const { SubjectEventsSection } = await import('./SubjectEventsSection')

    const pastEvents = [
      {
        id: 'event-1',
        titulo: 'TP 1',
        fecha: '2026-06-05',
        hora: '12:00',
        descripcion: null,
        tipoEvento: { nombre: 'Trabajo Práctico' },
        tipoEventoId: 'tipo-2',
        commissionId: null,
      },
      {
        id: 'event-2',
        titulo: 'Parcial',
        fecha: '2026-06-19',
        hora: '15:00',
        descripcion: 'BD activas',
        tipoEvento: { nombre: 'Examen' },
        tipoEventoId: 'tipo-1',
        commissionId: null,
      },
    ]

    const markup = renderToStaticMarkup(
      <SubjectEventsSection
        subject={baseSubject}
        agendaId="agenda-1"
        tiposEvento={tiposEvento}
        categoriasDisponibles={[]}
        commissions={[]}
        events={pastEvents}
        periodos={[]}
        chipClassName=""
      />,
    )

    expect(markup).toContain('No hay eventos próximos para mostrar')
    expect(markup).not.toContain('TP 1')
    expect(markup).not.toContain('Parcial')
  })

  it('muestra eventos próximos cuando hay fechas futuras respecto a hoy', async () => {
    const { SubjectEventsSection } = await import('./SubjectEventsSection')

    const mixedEvents = [
      {
        id: 'event-past',
        titulo: 'TP Pasado',
        fecha: '2026-06-05',
        hora: '12:00',
        descripcion: null,
        tipoEvento: { nombre: 'Trabajo Práctico' },
        tipoEventoId: 'tipo-2',
        commissionId: null,
      },
      {
        id: 'event-future',
        titulo: 'Segundo Parcial',
        fecha: '2026-08-25',
        hora: '18:00',
        descripcion: 'SQL avanzado',
        tipoEvento: { nombre: 'Examen' },
        tipoEventoId: 'tipo-1',
        commissionId: null,
      },
    ]

    const markup = renderToStaticMarkup(
      <SubjectEventsSection
        subject={baseSubject}
        agendaId="agenda-1"
        tiposEvento={tiposEvento}
        categoriasDisponibles={[]}
        commissions={[]}
        events={mixedEvents}
        periodos={[]}
        chipClassName=""
      />,
    )

    expect(markup).not.toContain('No hay eventos próximos para mostrar')
    expect(markup).toContain('Segundo Parcial')
    expect(markup).not.toContain('TP Pasado')
  })
})
