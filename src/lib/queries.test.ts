import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  cacheTag: vi.fn(), cacheLife: vi.fn(), $queryRaw: vi.fn(),
  evento: { findMany: vi.fn() },
  subject: { findUnique: vi.fn() }, academicYear: { findUnique: vi.fn() },
  categoria: { findMany: vi.fn() }, apunte: { findMany: vi.fn() },
}))
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheTag: mocks.cacheTag, cacheLife: mocks.cacheLife }))
vi.mock('./prisma', () => ({ prisma: mocks }))
vi.mock('./storage', () => ({ quizBanksCacheTag: (y: string, s: string) => `quiz-banks:${y}:${s}` }))
import { getSubjectPageBySlug, getApuntePageBySlug, getSubjectQuizMeta, getYearBySlug, getLatestApuntesByYear, getLatestApuntes, getHomeCalendarEvents } from './queries'
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


describe('lean cached queries and stable ordering', () => {
  beforeEach(() => vi.resetAllMocks())
  it('returns current recent-note DTOs from one parameterized, bounded SQL query', async () => {
    mocks.$queryRaw.mockResolvedValue([{
      id: 'n', titulo: 'Note', slug: 'note', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
      subjectSlug: 'calculo', subjectNombre: 'Calculus', yearSlug: 'primero', yearNombre: 'First',
    }])
    expect(await getLatestApuntes()).toEqual([{
      id: 'n', titulo: 'Note', slug: 'note', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
      subject: { slug: 'calculo', nombre: 'Calculus', year: { slug: 'primero', nombre: 'First' } },
    }])
    expect(mocks.$queryRaw).toHaveBeenCalledOnce()
    const [parts, limit] = mocks.$queryRaw.mock.calls[0]
    const sql = parts.join('$1')
    expect(limit).toBe(6)
    expect(sql).toContain('ROW_NUMBER() OVER')
    expect(sql).toContain('PARTITION BY "subjectId" ORDER BY "updatedAt" DESC, "id" DESC')
    expect(sql).toContain('JOIN "Subject"')
    expect(sql).toContain('JOIN "AcademicYear"')
    expect(sql).toContain('WHERE a.rank <= $1')
    expect(sql).toContain('ORDER BY a."updatedAt" DESC, a."id" DESC')
    expect(sql).not.toMatch(/SELECT \*|recursos|descripcion|createdByUserId/)
    expect(mocks.apunte.findMany).not.toHaveBeenCalled()
    expect(tags()).toEqual(['career', 'latest-apuntes'])
    expect(mocks.cacheLife).toHaveBeenCalledWith({ revalidate: 300, expire: 3600 })
  })
  it('maps an empty recent-note result without extra queries', async () => {
    mocks.$queryRaw.mockResolvedValue([])
    expect(await getLatestApuntes()).toEqual([])
    expect(mocks.$queryRaw).toHaveBeenCalledOnce()
  })
  it('keeps the configurable year limit with deterministic timestamp ties', async () => {
    mocks.apunte.findMany.mockResolvedValue([])
    await getLatestApuntesByYear('primero', 3)
    expect(mocks.apunte.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] }))
    expect(tags()).toEqual(['latest-apuntes-year:primero'])
  })
  it('home calendar selects only fields its adapter consumes and keeps full history', async () => {
    mocks.evento.findMany.mockResolvedValue([])
    await getHomeCalendarEvents()
    const query = mocks.evento.findMany.mock.calls[0][0]
    expect(query.orderBy).toEqual([{ fecha: 'asc' }, { hora: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }])
    expect(query).not.toHaveProperty('where')
    expect(query).not.toHaveProperty('take')
    expect(query.select).not.toHaveProperty('createdByUserId')
    expect(query.select.agenda.select.commission.select).toEqual({ slug: true, nombre: true })
    expect(query.select.agenda.select.subject.select).not.toHaveProperty('commissions')
    expect(query.select.agenda.select.subject.select.year.select).toEqual({ id: true, slug: true, nombre: true })
  })
  it('serializes author display names once while retaining ownership and event details', async () => {
    mocks.categoria.findMany.mockResolvedValue([])
    mocks.subject.findUnique.mockResolvedValue({
      id: 's', year, commissions: [], apuntes: [], _count: { apuntes: 0 },
      agendas: [{ id: 'a', commissionId: null, commission: null, eventos: [{
        id: 'e', titulo: 'Event', descripcion: 'Details', fecha: new Date('2026-01-01'), hora: null,
        createdByUserId: 'u', createdBy: { nombreUsuario: 'Author' }, apuntes: [], tipoEventoId: 't', tipoEvento: { nombre: 'Class' },
      }] }],
    })
    const result = await getSubjectPageBySlug('calculo')
    const event = result?.agendas[0].eventos[0]
    expect(event).toMatchObject({ createdByNombre: 'Author', createdByUserId: 'u', descripcion: 'Details', fecha: '2026-01-01', apuntes: [] })
    expect(event).not.toHaveProperty('createdBy')
  })
})
