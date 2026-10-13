import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  updateTag: vi.fn(), revalidatePath: vi.fn(), auth: vi.fn(), scope: vi.fn(),
  award: vi.fn(), adjust: vi.fn(), revoke: vi.fn(), audit: vi.fn(), cleanup: vi.fn(), upload: vi.fn(),
  prisma: {
    apunte: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    categoria: { findMany: vi.fn() },
    apunteRecurso: { createMany: vi.fn(), deleteMany: vi.fn() },
    apunteCategoria: { createMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('next/cache', () => ({ updateTag: m.updateTag, revalidatePath: m.revalidatePath }))
vi.mock('@/lib/prisma', () => ({ prisma: m.prisma }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => ({ requireAnyAdmin: m.auth, requireYearAdminForApunteId: m.scope, requireYearAdminForSubjectId: m.scope, ensureCanManageContribution: vi.fn() }))
vi.mock('@/lib/storage', () => ({ deleteApunteHtml: m.cleanup, uploadApunteHtml: m.upload, MAX_APUNTE_HTML_BYTES: 1000, APUNTE_HTML_MIME: 'text/html', quizBanksCacheTag: (y: string, s: string) => `quiz-banks:${y}:${s}` }))
vi.mock('@/lib/audit', () => ({ recordAudit: m.audit, AUDIT_ACTIONS: { APUNTE_CREATED: 'create', APUNTE_UPDATED: 'update', APUNTE_DELETED: 'delete' } }))
vi.mock('@/lib/contributions', () => ({ awardApunteCreated: m.award, adjustContributionScore: m.adjust, revokeApunteCreated: m.revoke }))
import { createApunteAction, updateApunteAction, deleteApunteAction } from './apuntes'
const scope = { subjectSlug: 'calculo', yearSlug: 'primero', yearId: 'y', commissionSlugs: [], admin: { id: 'u' } }
const note = { slug: 'old', titulo: 'Old', subjectId: 's', createdByUserId: 'u', _count: { recursos: 1, eventos: 0 }, recursos: [] }
const tags = () => m.updateTag.mock.calls.map(([tag]) => tag).sort()
const baseTags = ['apunte:calculo:old', 'latest-apuntes', 'latest-apuntes-year:primero', 'subject-content:calculo']
function form(entries: Record<string, string> = {}) {
  const result = new FormData()
  for (const [k, v] of Object.entries({ apunteId: 'n', subjectId: 's', titulo: 'Old', slug: 'old', recursosJson: JSON.stringify([{ tipo: 'OTHER', url: 'https://example.com', orden: 0 }]), categoriaIdsJson: '["c"]', ...entries })) result.set(k, v)
  return result
}
beforeEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
  m.scope.mockResolvedValue(scope)
  m.prisma.apunte.findUnique.mockResolvedValue(note)
  m.prisma.apunte.findFirst.mockResolvedValue(null)
  m.prisma.apunte.findMany.mockResolvedValue([])
  m.prisma.apunte.create.mockResolvedValue({ id: 'n' })
  m.prisma.apunte.delete.mockResolvedValue({ id: 'n' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  m.prisma.categoria.findMany.mockResolvedValue([{ id: 'c' }])
  m.prisma.$transaction.mockImplementation(async (fn) => fn(m.prisma))
})
describe('note cache invalidation', () => {
  it('creates exact detail and list invalidation before scoring', async () => {
    expect((await createApunteAction({ ok: false, message: '' }, form())).ok).toBe(true)
    expect(tags()).toEqual(baseTags)
    expect(m.updateTag.mock.invocationCallOrder[0]).toBeLessThan(m.award.mock.invocationCallOrder[0])
  })
  it('scoring failure leaves the committed note visible and already invalidated', async () => {
    m.award.mockRejectedValue(new Error('scoring unavailable'))
    await expect(createApunteAction({ ok: false, message: '' }, form())).rejects.toThrow('scoring unavailable')
    expect(tags()).toEqual(baseTags)
    expect(m.prisma.apunte.delete).not.toHaveBeenCalled()
    expect(m.updateTag.mock.invocationCallOrder[0]).toBeLessThan(m.award.mock.invocationCallOrder[0])
  })
  it('unlinked edits avoid year/global events', async () => {
    expect((await updateApunteAction({ ok: false, message: '' }, form())).ok).toBe(true)
    expect(tags()).toEqual(baseTags)
    expect(m.prisma.apunte.findUnique).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ titulo: true, slug: true, _count: { select: { recursos: true, eventos: true } } }) }))
  })
  it('linked renames invalidate both details and event projections', async () => {
    m.prisma.apunte.findUnique.mockResolvedValue({ ...note, _count: { recursos: 1, eventos: 2 } })
    await updateApunteAction({ ok: false, message: '' }, form({ slug: 'new' }))
    expect(tags()).toEqual(['apunte:calculo:new', ...baseTags, 'upcoming-events', 'year:primero'].sort())
    expect(m.revalidatePath).toHaveBeenCalledWith('/primero/calculo/apuntes/old')
    expect(m.revalidatePath).toHaveBeenCalledWith('/primero/calculo/apuntes/new')
  })
  it('linked notes with unchanged titles/slugs do not expire events', async () => {
    m.prisma.apunte.findUnique.mockResolvedValue({ ...note, _count: { recursos: 1, eventos: 2 } })
    await updateApunteAction({ ok: false, message: '' }, form())
    expect(tags()).toEqual(baseTags)
  })
  it('committed updates remain invalidated when scoring fails', async () => {
    m.prisma.apunte.findUnique.mockResolvedValue({ ...note, _count: { recursos: 2, eventos: 0 } })
    m.adjust.mockRejectedValue(new Error('scoring unavailable'))
    await expect(updateApunteAction({ ok: false, message: '' }, form())).rejects.toThrow('scoring unavailable')
    expect(tags()).toEqual(baseTags)
    expect(m.audit).not.toHaveBeenCalled()
  })
  it('rolled-back updates do not invalidate caches', async () => {
    m.prisma.$transaction.mockRejectedValue(new Error('rollback'))
    expect((await updateApunteAction({ ok: false, message: '' }, form())).ok).toBe(false)
    expect(tags()).toEqual([])
  })
  it('confirmed creation compensation does not invalidate', async () => {
    m.prisma.apunteRecurso.createMany.mockRejectedValue(new Error('resource failed'))
    expect((await createApunteAction({ ok: false, message: '' }, form())).ok).toBe(false)
    expect(m.prisma.apunte.delete).toHaveBeenCalled()
    expect(tags()).toEqual([])
  })
  it('failed compensation cleanup conservatively invalidates and preserves the thrown error', async () => {
    m.prisma.apunteRecurso.createMany.mockRejectedValue(new Error('resource failed'))
    m.cleanup.mockRejectedValue(new Error('cleanup failed'))
    await expect(createApunteAction({ ok: false, message: '' }, form())).rejects.toThrow('cleanup failed')
    expect(tags()).toEqual(baseTags)
    expect(m.prisma.apunte.delete).not.toHaveBeenCalled()
  })
  it('uncertain creation compensation conservatively invalidates', async () => {
    m.prisma.apunteRecurso.createMany.mockRejectedValue(new Error('resource failed'))
    m.prisma.apunte.delete.mockRejectedValue(new Error('compensation failed'))
    expect((await createApunteAction({ ok: false, message: '' }, form())).ok).toBe(false)
    expect(tags()).toEqual(baseTags)
  })
  it('upload exceptions after metadata creation conservatively invalidate', async () => {
    m.upload.mockRejectedValue(new Error('upload unavailable'))
    const f = form({ recursosJson: JSON.stringify([{ tipo: 'HTML', localId: 'file', orden: 0 }]) })
    f.set('htmlFile:file', new File(['<html>demo</html>'], 'demo.html', { type: 'text/html' }))
    await expect(createApunteAction({ ok: false, message: '' }, f)).rejects.toThrow('upload unavailable')
    expect(tags()).toEqual(baseTags)
  })
  it('deletes linked notes and invalidates before cleanup failure', async () => {
    m.prisma.apunte.findUnique.mockResolvedValue({ ...note, _count: { recursos: 1, eventos: 1 } })
    m.cleanup.mockRejectedValue(new Error('storage unavailable'))
    await expect(deleteApunteAction(form({ id: 'n' }))).rejects.toThrow('storage unavailable')
    expect(tags()).toEqual([...baseTags, 'upcoming-events', 'year:primero'])
    expect(m.revoke).not.toHaveBeenCalled()
  })
  it('missing notes do not delete or invalidate', async () => {
    m.prisma.apunte.findUnique.mockResolvedValue(null)
    await deleteApunteAction(form({ id: 'n' }))
    expect(tags()).toEqual([])
    expect(m.prisma.apunte.delete).not.toHaveBeenCalled()
  })
})
