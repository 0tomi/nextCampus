import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const queries = vi.hoisted(() => ({ subject: vi.fn(), names: vi.fn(), list: vi.fn(), summaries: vi.fn(), fullBanks: vi.fn(), runner: vi.fn() }))
vi.mock('@/lib/queries', () => ({ getSubjectQuizMeta: queries.subject, getUserNamesByAccountId: queries.names }))
vi.mock('@/lib/storage', () => ({ listQuizBanks: queries.list, getQuizBankSummaries: queries.summaries, readQuizBanks: queries.fullBanks }))
vi.mock('@/components/shell/CampusHeaderBrand', () => ({ CampusHeaderBrand: () => null }))
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('./QuizRunner', () => ({ QuizRunner: (props: unknown) => { queries.runner(props); return null } }))
import QuizPage from './page'

it('configures the runner from summaries and resolves author names concurrently', async () => {
  const bank = { id: 'bank', nombre: 'Repaso', totalPreguntas: 2, subidoPorId: 'owner', subidoEl: '2026-01-01', subidoPor: 'private@example.com' }
  queries.subject.mockResolvedValue({ id: 'subject', slug: 'calculo', nombre: 'Cálculo', year: { id: 'year', slug: 'primero' } })
  queries.list.mockResolvedValue([bank])
  queries.names.mockResolvedValue(new Map([['owner', 'Ana']]))
  let resolveSummaries!: (value: unknown) => void
  queries.summaries.mockReturnValue(new Promise((resolve) => { resolveSummaries = resolve }))
  const pendingPage = QuizPage({ params: Promise.resolve({ yearSlug: 'primero', subjectSlug: 'calculo' }) })
  await vi.waitFor(() => expect(queries.names).toHaveBeenCalledWith(['owner']))
  expect(queries.fullBanks).not.toHaveBeenCalled()
  resolveSummaries([{ ...bank, unidades: [{ nombre: 'Límites', totalPreguntas: 2 }] }])
  renderToStaticMarkup(await pendingPage)
  expect(queries.runner).toHaveBeenCalledWith(expect.objectContaining({ bancos: [expect.objectContaining({ unidades: [{ nombre: 'Límites', totalPreguntas: 2 }], subidoPorNombre: 'Ana' })] }))
  expect(JSON.stringify(queries.runner.mock.calls)).not.toContain('private@example.com')
})

describe('quiz summary source', () => {
  it('does not request full banks while rendering configuration', () => expect(queries.fullBanks).not.toHaveBeenCalled())
})
