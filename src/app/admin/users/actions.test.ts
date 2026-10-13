import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  auth: vi.fn(), updateTag: vi.fn(), revalidatePath: vi.fn(), audit: vi.fn(), authUpdate: vi.fn(),
  prisma: { userAccount: { findUnique: vi.fn(), update: vi.fn() }, academicYear: { count: vi.fn(), findMany: vi.fn() }, subject: { findMany: vi.fn() }, userYearPermission: { deleteMany: vi.fn(), createMany: vi.fn() }, $transaction: vi.fn() },
}))
vi.mock('next/cache', () => ({ updateTag: m.updateTag, revalidatePath: m.revalidatePath }))
vi.mock('@/lib/auth', () => ({ requireGeneralAdmin: m.auth }))
vi.mock('@/lib/prisma', () => ({ prisma: m.prisma }))
vi.mock('@/lib/queries', () => ({ queryTags: { subjectAuthors: (s: string) => `subject-authors:${s}`, year: (s: string) => `year:${s}` } }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ auth: { admin: { updateUserById: m.authUpdate } } }) }))
vi.mock('@/lib/audit', () => ({ recordAudit: m.audit, AUDIT_ACTIONS: { USER_UPDATED: 'update' } }))
import { updateAdminCampusAction } from './actions'
function form(name = 'Current') {
  const f = new FormData()
  for (const [k, v] of Object.entries({ id: 'u', nombreUsuario: name, email: 'user@campus.test', role: 'AYUDANTE', status: 'ACTIVE', yearIds: 'y' })) f.set(k, v)
  return f
}
beforeEach(() => {
  vi.resetAllMocks()
  m.auth.mockResolvedValue({ id: 'admin' })
  m.prisma.academicYear.count.mockResolvedValue(1)
  m.prisma.userAccount.findUnique.mockImplementation(async ({ where }) => where.id ? { id: 'u', authUserId: 'auth-u', nombreUsuario: 'Current', email: 'user@campus.test', role: 'AYUDANTE' } : null)
  m.prisma.subject.findMany.mockResolvedValue([{ slug: 'calculo' }])
  m.prisma.academicYear.findMany.mockResolvedValue([{ slug: 'primero' }])
  m.prisma.$transaction.mockImplementation(async (fn) => fn(m.prisma))
  m.authUpdate.mockResolvedValue({ error: null })
})
describe('admin user public-name invalidation', () => {
  it('permission/status edits without a name change leave public caches intact', async () => {
    const f = form(); f.set('status', 'DISABLED')
    expect((await updateAdminCampusAction({ ok: false, message: '' }, f)).ok).toBe(true)
    expect(m.prisma.subject.findMany).not.toHaveBeenCalled()
    expect(m.updateTag).not.toHaveBeenCalled()
  })
  it('name changes resolve dependencies before committing and expire them before audit', async () => {
    expect((await updateAdminCampusAction({ ok: false, message: '' }, form('Next'))).ok).toBe(true)
    expect(m.updateTag.mock.calls).toEqual([['subject-authors:calculo'], ['year:primero']])
    expect(m.prisma.subject.findMany.mock.invocationCallOrder[0]).toBeLessThan(m.prisma.$transaction.mock.invocationCallOrder[0])
    expect(m.updateTag.mock.invocationCallOrder[0]).toBeLessThan(m.audit.mock.invocationCallOrder[0])
  })
  it('rolled-back name updates do not invalidate', async () => {
    m.prisma.$transaction.mockRejectedValue(new Error('rollback'))
    expect((await updateAdminCampusAction({ ok: false, message: '' }, form('Next'))).ok).toBe(false)
    expect(m.updateTag).not.toHaveBeenCalled()
  })
  it('audit failure cannot prevent invalidating a committed name change', async () => {
    m.audit.mockRejectedValue(new Error('audit failed'))
    expect((await updateAdminCampusAction({ ok: false, message: '' }, form('Next'))).ok).toBe(false)
    expect(m.updateTag.mock.calls).toEqual([['subject-authors:calculo'], ['year:primero']])
  })
})
