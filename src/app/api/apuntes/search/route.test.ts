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
  queryRawMock.mockResolvedValue([])
})

describe('GET /api/apuntes/search', () => {
  it('rechaza búsquedas demasiado cortas', async () => {
    const { GET } = await import('./route')
    const response = await GET(new Request('http://campus.test/api/apuntes/search?q=a'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Escribí al menos 2 caracteres.', items: [] })
    expect(queryRawMock).not.toHaveBeenCalled()
  })

  it('rechaza búsquedas demasiado largas con un mensaje claro', async () => {
    const { GET } = await import('./route')
    const response = await GET(new Request(`http://campus.test/api/apuntes/search?q=${'a'.repeat(121)}`))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Probá con una búsqueda más corta.', items: [] })
    expect(queryRawMock).not.toHaveBeenCalled()
  })

  it('devuelve resultados públicos y no cachea la respuesta', async () => {
    queryRawMock.mockResolvedValue([
      {
        id: 'apunte-1',
        title: 'Parcial',
        slug: 'parcial',
        excerpt: null,
        categories: ['Resumen'],
        resourceTypes: ['DRIVE'],
        subjectName: 'Materia',
        subjectSlug: 'materia',
        yearName: 'Primer año',
        yearSlug: 'primer-anio',
        rank: 0.5,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ])

    const { GET } = await import('./route')
    const response = await GET(new Request('http://campus.test/api/apuntes/search?q= parcial '))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(queryRawMock.mock.calls[0][1]).toBe('parcial')
    expect(body).toMatchObject({
      query: 'parcial',
      items: [
        {
          id: 'apunte-1',
          href: '/primer-anio/materia/apuntes/parcial',
        },
      ],
    })
  })

  it('devuelve error controlado si falla la búsqueda', async () => {
    queryRawMock.mockRejectedValue(new Error('db down'))

    const { GET } = await import('./route')
    const response = await GET(new Request('http://campus.test/api/apuntes/search?q=parcial'))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: 'No pudimos buscar ahora. Probá de nuevo en unos segundos.',
      items: [],
    })
  })
})
