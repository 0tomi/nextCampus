import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  cacheTag: vi.fn(), cacheLife: vi.fn(),
  subject: { findUnique: vi.fn() }, academicYear: { findUnique: vi.fn() },
  categoria: { findMany: vi.fn() }, apunte: { findMany: vi.fn() },
}))
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheTag: mocks.cacheTag, cacheLife: mocks.cacheLife }))
vi.mock('./prisma', () => ({ prisma: mocks }))
vi.mock('./storage', () => ({ quizBanksCacheTag: (y: string, s: string) => `quiz-banks:${y}:${s}` }))
import { getSubjectPageBySlug, getApuntePageBySlug, getSubjectQuizMeta, getYearBySlug, getLatestApuntesByYear } from './queries'
const tags = () => mocks.cacheTag.mock.calls.flat().sort()
const year = { id: 'year-1', slug: 'primero', nombre: 'First', color: null, career: { nombre: 'Campus' } }
describe('public cache dependencies', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.categoria.findMany.mockResolvedValue([])
    mocks.apunte.findMany.mockResolvedValue([])
  })
  it('registers subject argument tags even when the subject does not exist', async () => {
    mocks.subject.findUnique.mockResolvedValue(null)
    expect(await getSubjectPageBySlug('calculo')).toBeNull()
    expect(tags()).toEqual(['categorias-apunte', 'subject-authors:calculo', 'subject-content:calculo', 'subject:calculo'])
  })
  it('registers a missing note and its existing year without content-wide dependency', async () => {
    mocks.subject.findUnique.mockResolvedValue({ year, apuntes: [] })
    expect(await getApuntePageBySlug('calculo', 'missing')).toBeNull()
    expect(tags()).toEqual(['apunte:calculo:missing', 'categorias-apunte', 'subject-authors:calculo', 'subject:calculo', 'year-meta:primero'])
  })
  it('registers note identity even when its subject is absent', async () => {
    mocks.subject.findUnique.mockResolvedValue(null)
    expect(await getApuntePageBySlug('calculo', 'missing')).toBeNull()
    expect(tags()).toEqual(['apunte:calculo:missing', 'categorias-apunte', 'subject-authors:calculo', 'subject:calculo'])
  })
  it('subject views depend on year presentation and author/category projections', async () => {
    mocks.subject.findUnique.mockResolvedValue({ id: 's', year, agendas: [], commissions: [], apuntes: [], _count: { apuntes: 0 } })
    await getSubjectPageBySlug('calculo')
    expect(tags()).toEqual(['categorias-apunte', 'subject-authors:calculo', 'subject-content:calculo', 'subject:calculo', 'year-meta:primero'])
  })
  it('quiz identity depends on year identity but not events or notes', async () => {
    mocks.subject.findUnique.mockResolvedValue({ id: 's', year })
    await getSubjectQuizMeta('calculo')
    expect(tags()).toEqual(['subject:calculo', 'year-meta:primero'])
  })
  it('missing years retain their structural and metadata tags', async () => {
    mocks.academicYear.findUnique.mockResolvedValue(null)
    expect(await getYearBySlug('primero')).toBeNull()
    expect(tags()).toEqual(['career', 'year-meta:primero', 'year:primero'])
  })
  it('year recent lists have no event-wide dependency', async () => {
    await getLatestApuntesByYear('primero')
    expect(tags()).toEqual(['latest-apuntes-year:primero'])
  })
})
