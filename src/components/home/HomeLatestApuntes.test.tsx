import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { HomeLatestApunte } from './HomeLatestApuntes'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function makeApunte(overrides: Partial<HomeLatestApunte> = {}): HomeLatestApunte {
  return {
    id: 'apunte-1',
    titulo: 'Parcial 1 resuelto',
    slug: 'parcial-1-resuelto',
    createdAt: new Date('2026-05-20T12:00:00.000Z'),
    subjectSlug: 'calculo',
    subjectNombre: 'Cálculo',
    yearSlug: 'primer-anio',
    yearNombre: 'Primer año',
    ...overrides,
  }
}

describe('HomeLatestApuntes', () => {
  it('muestra cards navegables con el año y la materia visibles', async () => {
    const { HomeLatestApuntes } = await import('./HomeLatestApuntes')

    const markup = renderToStaticMarkup(
      <HomeLatestApuntes
        initialPrefs={{ hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [] }}
        notes={[makeApunte()]}
      />,
    )

    expect(markup).toContain('Últimos apuntes subidos')
    expect(markup).toContain('Material nuevo para repasar')
    expect(markup).toContain('Primer año')
    expect(markup).toContain('Cálculo')
    expect(markup).toContain('href="/primer-anio/calculo/apuntes/parcial-1-resuelto"')
    expect(markup).toContain('Parcial 1 resuelto')
  })

  it('respeta materias ocultas y muestra un estado vacío amigable', async () => {
    const { HomeLatestApuntes } = await import('./HomeLatestApuntes')

    const markup = renderToStaticMarkup(
      <HomeLatestApuntes
        initialPrefs={{
          hiddenYears: [],
          hiddenSubjects: ['calculo'],
          hiddenCommissions: [],
        }}
        notes={[makeApunte()]}
      />,
    )

    expect(markup).not.toContain('Parcial 1 resuelto')
    expect(markup).toContain('Con tu selección actual no aparece material nuevo todavía.')
  })

  it('mantiene un empty state amigable cuando todavía no hay apuntes', async () => {
    const { HomeLatestApuntes } = await import('./HomeLatestApuntes')

    const markup = renderToStaticMarkup(
      <HomeLatestApuntes
        variant="mobile"
        initialPrefs={{ hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [] }}
        notes={[]}
      />,
    )

    expect(markup).toContain('Todavía no hay apuntes nuevos para mostrar.')
  })
})
