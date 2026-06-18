import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryRawMock = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock,
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('searchApuntes', () => {
  it('ejecuta FTS parametrizado y arma hrefs públicos', async () => {
    queryRawMock.mockResolvedValue([
      {
        id: 'apunte-1',
        title: 'Cálculo diferencial',
        slug: 'calculo-diferencial',
        excerpt: 'Resumen de derivadas.',
        categories: ['Resumen'],
        resourceTypes: ['DRIVE', 'HTML'],
        subjectName: 'Cálculo Diferencial e Integral',
        subjectSlug: 'calculo-diferencial-e-integral',
        yearName: 'Primer año',
        yearSlug: 'primer-anio',
        rank: 0.5,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ])

    const { searchApuntes } = await import('./apunte-search')
    const items = await searchApuntes({ q: 'calcular' })

    expect(queryRawMock).toHaveBeenCalledTimes(1)
    expect(queryRawMock.mock.calls[0][1]).toBe('calcular')
    expect(items).toEqual([
      {
        id: 'apunte-1',
        title: 'Cálculo diferencial',
        slug: 'calculo-diferencial',
        href: '/primer-anio/calculo-diferencial-e-integral/apuntes/calculo-diferencial',
        excerpt: 'Resumen de derivadas.',
        categories: ['Resumen'],
        resourceTypes: ['DRIVE', 'HTML'],
        subject: {
          name: 'Cálculo Diferencial e Integral',
          slug: 'calculo-diferencial-e-integral',
        },
        year: {
          name: 'Primer año',
          slug: 'primer-anio',
        },
      },
    ])
  })

  it('normaliza arrays nulos de categorías y recursos', async () => {
    queryRawMock.mockResolvedValue([
      {
        id: 'apunte-2',
        title: 'Sin recursos',
        slug: 'sin-recursos',
        excerpt: null,
        categories: null,
        resourceTypes: null,
        subjectName: 'Materia',
        subjectSlug: 'materia',
        yearName: 'Año',
        yearSlug: 'anio',
        rank: 0.2,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ])

    const { searchApuntes } = await import('./apunte-search')
    const [item] = await searchApuntes({ q: 'tema' })

    expect(item.categories).toEqual([])
    expect(item.resourceTypes).toEqual([])
  })
})
