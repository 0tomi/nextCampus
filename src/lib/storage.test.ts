import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuizBankMeta } from './domain/quiz-bank'

const storage = vi.hoisted(() => ({ list: vi.fn(), download: vi.fn(), upload: vi.fn(), remove: vi.fn(), tag: vi.fn(), life: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheTag: storage.tag, cacheLife: storage.life }))
vi.mock('@/lib/env', () => ({ env: { SUPABASE_STORAGE_BUCKET: 'test' } }))
vi.mock('./supabase/admin', () => ({ createSupabaseAdminClient: () => ({ storage: { from: () => storage } }) }))
import { getQuizBankSummaries, listQuizBanks, readQuizBanks, updateQuizBankMeta, uploadQuizBank } from './storage'

const meta: QuizBankMeta = { id: 'bank', nombre: 'Práctica', totalPreguntas: 2, subidoEl: '2026-01-01', subidoPor: 'owner@example.com' }
const bank = { title: 'Práctica', units: [{ name: 'Límites', questions: [{ type: 'truefalse', question: '¿Es cierto?', answer: true, explanation: 'Explicación privada' }, { type: 'truefalse', question: '¿Es falso?', answer: false }] }] }
const unidades = [{ nombre: 'Límites', totalPreguntas: 2 }]

beforeEach(() => {
  vi.clearAllMocks()
  storage.upload.mockResolvedValue({ error: null })
  storage.remove.mockResolvedValue({ error: null })
  storage.download.mockResolvedValue({ data: new Blob([JSON.stringify(bank)]), error: null })
})

describe('quiz configuration summaries', () => {
  it('reads no full bank for a current sidecar and uses the shared invalidation tag', async () => {
    const summaries = await getQuizBankSummaries('primero', 'calculo', [{ ...meta, unidades }])
    expect(summaries).toEqual([{ ...meta, unidades }])
    expect(storage.download).not.toHaveBeenCalled()
    expect(storage.tag).toHaveBeenCalledWith('quiz-banks:primero:calculo')
    expect(JSON.stringify(summaries)).not.toMatch(/answer|explanation|¿Es cierto/)
  })

  it('resolves legacy sidecars read-only and derives consistent totals', async () => {
    const summaries = await getQuizBankSummaries('primero', 'calculo', [{ ...meta, totalPreguntas: 99 }])
    expect(summaries).toEqual([{ ...meta, unidades }])
    expect(storage.download).toHaveBeenCalledWith('quizzes/primero/calculo/bank.json')
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('does not trust inconsistent unit counts', async () => {
    const summaries = await getQuizBankSummaries('primero', 'calculo', [{ ...meta, unidades: [{ nombre: 'Incorrecta', totalPreguntas: 9 }] }])
    expect(summaries[0].unidades).toEqual(unidades)
    expect(summaries[0].totalPreguntas).toBe(2)
  })

  it('handles unavailable legacy content without inventing units or counts', async () => {
    storage.download.mockResolvedValue({ data: null, error: { message: 'missing' } })
    expect(await getQuizBankSummaries('primero', 'calculo', [meta])).toEqual([{ ...meta, totalPreguntas: 0, unidades: [] }])
  })

  it('preserves unit metadata while parsing current and legacy sidecars', async () => {
    storage.list.mockResolvedValue({ data: [{ name: 'bank.meta.json' }, { name: 'legacy.meta.json' }, { name: 'orphan.json' }], error: null })
    storage.download.mockImplementation(async (key: string) => ({ data: new Blob([JSON.stringify(key.includes('legacy') ? { ...meta, id: 'legacy' } : { ...meta, unidades })]), error: null }))
    expect(await listQuizBanks('primero', 'calculo')).toEqual([{ ...meta, unidades }, { ...meta, id: 'legacy' }])
    expect(storage.download).toHaveBeenCalledTimes(2)
  })

  it('continues reading full answer-bearing banks for quiz execution', async () => {
    const banks = await readQuizBanks('primero', 'calculo', ['bank'])
    expect(banks.get('bank')?.units[0].questions[0].answer).toBe(true)
  })
})

describe('quiz metadata writes', () => {
  it('writes consistent summary counts derived from the uploaded content', async () => {
    const result = await uploadQuizBank({ yearSlug: 'primero', subjectSlug: 'calculo', nombre: 'Práctica', rawJson: JSON.stringify(bank), totalPreguntas: 99, subidoPor: 'owner@example.com', subidoPorId: 'owner' })
    expect(result.totalPreguntas).toBe(2)
    expect(result.unidades).toEqual(unidades)
    const calls = storage.upload.mock.calls
    expect(calls[0][0]).toMatch(/\.json$/)
    expect(calls[1][0]).toMatch(/\.meta\.json$/)
    expect(JSON.parse(await (calls[1][1] as Blob).text())).toEqual(result)
    expect(JSON.stringify(result)).not.toMatch(/answer|explanation/)
  })

  it('rolls back the bank if the metadata commit fails', async () => {
    storage.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'failed' } })
    await expect(uploadQuizBank({ yearSlug: 'primero', subjectSlug: 'calculo', nombre: 'Práctica', rawJson: JSON.stringify(bank), totalPreguntas: 2, subidoPor: 'owner@example.com', subidoPorId: 'owner' })).rejects.toThrow('registrar')
    expect(storage.remove).toHaveBeenCalledWith([storage.upload.mock.calls[0][0]])
  })

  it('retains summary metadata on description-only writes', async () => {
    await updateQuizBankMeta('primero', 'calculo', { ...meta, unidades, descripcion: 'Actualizada' })
    expect(JSON.parse(await (storage.upload.mock.calls[0][1] as Blob).text())).toEqual({ ...meta, unidades, descripcion: 'Actualizada' })
    expect(storage.download).not.toHaveBeenCalled()
  })
})
