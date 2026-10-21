import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { QuizRunnerClient } from './QuizRunnerClient'

const access = vi.hoisted(() => ({ allowed: true }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/components/admin/AdminControls', () => ({
  AdminControls: ({ children, yearId, noWrapper }: { children: React.ReactNode; yearId?: string; noWrapper?: boolean }) =>
    access.allowed ? <div data-year={yearId} data-mobile-visible={noWrapper}>{children}</div> : null,
}))
vi.mock('@/components/admin/QuizBankModal', () => ({ QuizBankModal: () => null }))
vi.mock('./QuizConfigPhase', () => ({ QuizConfigPhase: () => null }))
vi.mock('./QuizProvider', () => ({
  QuizProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useQuiz: () => ({ bancos: [], state: { phase: 'config' } }),
}))
vi.mock('./QuizReadyPhase', () => ({ QuizReadyPhase: () => null }))
vi.mock('./QuizResultsPhase', () => ({ QuizResultsPhase: () => null }))
vi.mock('./QuizRunningPhase', () => ({ QuizRunningPhase: () => null }))
vi.mock('./RankedHistory', () => ({ RankedHistoryModal: () => null }))


const props = { subjectNombre: 'Bases de Datos', subjectSlug: 'bases-de-datos', yearId: 'year-3' }

describe('quiz upload access', () => {
  it('shows upload on mobile and desktop even when no banks exist', () => {
    access.allowed = true
    const markup = renderToStaticMarkup(<QuizRunnerClient {...props} bancos={[]} />)
    expect(markup).toContain('Subir banco de preguntas')
    expect(markup).toContain('data-year="year-3"')
    expect(markup).toContain('data-mobile-visible="true"')
  })

  it('keeps the upload action available when choosing an existing bank', () => {
    access.allowed = true
    const markup = renderToStaticMarkup(<QuizRunnerClient {...props} bancos={[{
      id: 'bank', nombre: 'Repaso', totalPreguntas: 3, descripcion: null,
      unidades: [], subidoPorId: null, subidoPorNombre: null,
    }]} />)
    expect(markup).toContain('Subir banco de preguntas')
  })

  it('does not offer uploads to unauthorized visitors', () => {
    access.allowed = false
    const markup = renderToStaticMarkup(<QuizRunnerClient {...props} bancos={[]} />)
    expect(markup).not.toContain('Subir banco de preguntas')
  })
})
