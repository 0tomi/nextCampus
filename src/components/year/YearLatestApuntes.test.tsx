import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { YearLatestApunteItem } from '@/lib/domain/year-page-adapters'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function makeApunte(overrides: Partial<YearLatestApunteItem> = {}): YearLatestApunteItem {
  return {
    id: 'apunte-1',
    titulo: 'Resumen unidad 1',
    slug: 'resumen-unidad-1',
    createdAt: '2026-06-10T12:00:00.000Z',
    subjectSlug: 'calculo',
    subjectNombre: 'Cálculo',
    yearSlug: 'primer-anio',
    yearNombre: 'Primer año',
    ...overrides,
  }
}

describe('YearLatestApuntes', () => {
  it('muestra cards navegables hacia apuntes del año actual', async () => {
    const { YearLatestApuntes } = await import('./YearLatestApuntes')

    const markup = renderToStaticMarkup(<YearLatestApuntes notes={[makeApunte()]} />)

    expect(markup).toContain('Últimos apuntes subidos')
    expect(markup).toContain('Resumen unidad 1')
    expect(markup).toContain('Cálculo')
    expect(markup).toContain('href="/primer-anio/calculo/apuntes/resumen-unidad-1"')
  })

  it('muestra un empty state claro cuando el año todavía no tiene apuntes', async () => {
    const { YearLatestApuntes } = await import('./YearLatestApuntes')

    const markup = renderToStaticMarkup(<YearLatestApuntes variant="mobile" notes={[]} />)

    expect(markup).toContain('Todavía no hay apuntes cargados')
    expect(markup).toContain('Cuando aparezcan materiales nuevos de este año, los vas a ver acá.')
  })
})
