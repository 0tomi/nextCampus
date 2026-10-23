import { describe, expect, it, vi } from 'vitest'

const queries = vi.hoisted(() => ({
  getYearBySlug: vi.fn(), getTiposEvento: vi.fn(), getCareer: vi.fn(),
  getCategoriasApunte: vi.fn(), getPeriodos: vi.fn(), getLatestApuntesByYear: vi.fn(),
  getTodayKeyAR: vi.fn(() => { throw new Error('Year shells must not depend on the cached day') }),
}))
vi.mock('@/lib/queries', () => queries)
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('not found') } }))
import { getYearRouteContext } from './year-route-context'

describe('year shell date isolation', () => {
  it('builds the complete undated event projection without reading the short-lived date cache', async () => {
    queries.getYearBySlug.mockResolvedValue({ id: 'y', slug: 'primero', nombre: 'Primero', descripcion: '', links: [], color: null, career: { nombre: 'Career' }, subjects: [] })
    queries.getTiposEvento.mockResolvedValue([])
    queries.getCareer.mockResolvedValue(null)
    queries.getCategoriasApunte.mockResolvedValue([])
    queries.getPeriodos.mockResolvedValue([])
    queries.getLatestApuntesByYear.mockResolvedValue([])
    const context = await getYearRouteContext('primero')
    expect(queries.getTodayKeyAR).not.toHaveBeenCalled()
    expect(context).not.toHaveProperty('nextEvents')
    expect(context).not.toHaveProperty('overviewEvents')
    expect(context).toHaveProperty('events', [])
  })
})
