import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  updateTag: vi.fn(), auth: vi.fn(), scope: vi.fn(), getMeta: vi.fn(), updateMeta: vi.fn(), audit: vi.fn(),
}))
vi.mock('next/cache', () => ({ updateTag: m.updateTag, revalidatePath: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => ({ requireAnyAdmin: m.auth, requireYearAdminForSubjectSlug: m.scope }))
vi.mock('@/lib/storage', () => ({
  uploadQuizBank: vi.fn(), deleteQuizBank: vi.fn(), readQuizBank: vi.fn(),
  getQuizBankMeta: m.getMeta, updateQuizBankMeta: m.updateMeta,
}))
vi.mock('@/lib/queries', () => ({ queryTags: { quizBanks: (y: string, s: string) => `quiz-banks:${y}:${s}` } }))
vi.mock('@/lib/audit', () => ({ recordAudit: m.audit, AUDIT_ACTIONS: { QUIZ_BANK_UPDATED: 'update' } }))
vi.mock('@/lib/contributions', () => ({ awardQuizBankCreated: vi.fn(), revokeQuizBankCreated: vi.fn() }))
import { updateQuizBankDescriptionAction } from './quiz'

const bankId = '6f1c2b7e-8d4a-4c3e-9b1a-2f5d7e8c9a01'
const scope = { subjectSlug: 'calculo', yearSlug: 'primero', yearId: 'y', admin: { id: 'owner', email: 'o@x.com', canManageAnyContribution: false } }
const meta = { id: bankId, nombre: 'Parcial 1', totalPreguntas: 10, subidoEl: '2026-01-01', subidoPor: 'o@x.com', subidoPorId: 'owner' }
const empty = { ok: false, message: '' }
function form(descripcion: string) {
  const f = new FormData()
  f.set('subjectSlug', 'calculo')
  f.set('bankId', bankId)
  f.set('descripcion', descripcion)
  return f
}

beforeEach(() => {
  vi.resetAllMocks()
  m.scope.mockResolvedValue(scope)
  m.getMeta.mockResolvedValue(meta)
})

describe('updateQuizBankDescriptionAction', () => {
  it('guarda la descripción del dueño e invalida el listado', async () => {
    const res = await updateQuizBankDescriptionAction(empty, form('  Repaso de límites.  '))
    expect(res.ok).toBe(true)
    expect(m.updateMeta).toHaveBeenCalledWith('primero', 'calculo', { ...meta, descripcion: 'Repaso de límites.' })
    expect(m.updateTag).toHaveBeenCalledWith('quiz-banks:primero:calculo')
  })

  it('una descripción vacía la quita', async () => {
    m.getMeta.mockResolvedValue({ ...meta, descripcion: 'vieja' })
    await updateQuizBankDescriptionAction(empty, form('   '))
    expect(m.updateMeta).toHaveBeenCalledWith('primero', 'calculo', meta)
  })

  it('rechaza a quien no es dueño del banco', async () => {
    m.getMeta.mockResolvedValue({ ...meta, subidoPorId: 'otro' })
    const res = await updateQuizBankDescriptionAction(empty, form('hola'))
    expect(res.ok).toBe(false)
    expect(m.updateMeta).not.toHaveBeenCalled()
  })

  it('permite a quien gestiona cualquier aporte', async () => {
    m.scope.mockResolvedValue({ ...scope, admin: { ...scope.admin, canManageAnyContribution: true } })
    m.getMeta.mockResolvedValue({ ...meta, subidoPorId: 'otro' })
    expect((await updateQuizBankDescriptionAction(empty, form('hola'))).ok).toBe(true)
  })

  it('rechaza descripciones demasiado largas', async () => {
    const res = await updateQuizBankDescriptionAction(empty, form('x'.repeat(1001)))
    expect(res.ok).toBe(false)
    expect(m.updateMeta).not.toHaveBeenCalled()
  })
})
