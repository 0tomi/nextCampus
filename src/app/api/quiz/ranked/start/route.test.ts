import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuizBankFile } from '@/lib/domain/quiz-bank'

const rankedCreateMock = vi.fn()
const getSubjectQuizMetaMock = vi.fn()
const listQuizBanksMock = vi.fn()
const readQuizBankMock = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    rankedQuizAttempt: { create: rankedCreateMock },
  },
}))
vi.mock('@/lib/queries', () => ({
  getSubjectQuizMeta: getSubjectQuizMetaMock,
}))
vi.mock('@/lib/storage', () => ({
  listQuizBanks: listQuizBanksMock,
  readQuizBank: readQuizBankMock,
}))

function makeBank(total: number): QuizBankFile {
  return {
    title: 'Banco ranked',
    units: [
      {
        name: 'Unidad 1',
        questions: Array.from({ length: total }, (_, index) => ({
          type: 'single' as const,
          question: `Pregunta ${index + 1}`,
          options: ['A', 'B', 'C'],
          answer: index % 3,
          explanation: '',
        })),
      },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  getSubjectQuizMetaMock.mockResolvedValue({ id: 'subject-1', slug: 'algoritmos', year: { slug: 'primero' } })
  listQuizBanksMock.mockResolvedValue([{ id: 'bank-1', nombre: 'Banco 1', totalPreguntas: 50, subidoEl: '', subidoPor: '' }])
  readQuizBankMock.mockResolvedValue(makeBank(50))
  rankedCreateMock.mockResolvedValue({ id: 'attempt-1' })
})

describe('POST /api/quiz/ranked/start', () => {
  it('crea un intento con el 20% del banco y preguntas públicas', async () => {
    const { POST } = await import('./route')
    const response = await POST(new Request('http://campus.test/api/quiz/ranked/start', {
      method: 'POST',
      body: JSON.stringify({ subject: 'algoritmos', bankId: 'bank-1', name: 'Tomi' }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ attemptId: 'attempt-1', mode: 'ranked', total: 10, participantName: 'Tomi' })
    expect(body.preguntas).toHaveLength(10)
    expect(body.preguntas[0]).not.toHaveProperty('answer')
    expect(body.preguntas[0].options[0]).toEqual(expect.objectContaining({ id: expect.any(Number), label: expect.any(String) }))
    expect(rankedCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        subjectId: 'subject-1',
        bankId: 'bank-1',
        participantName: 'Tomi',
        normalizedName: 'tomi',
        totalQuestions: 10,
        questionIds: expect.any(Array),
      }),
    }))
  })

  it('rechaza nombres ofensivos antes de crear el intento', async () => {
    const { POST } = await import('./route')
    const response = await POST(new Request('http://campus.test/api/quiz/ranked/start', {
      method: 'POST',
      body: JSON.stringify({ subject: 'algoritmos', bankId: 'bank-1', name: 'h.d.p' }),
    }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Elegí otro nombre para participar.')
    expect(rankedCreateMock).not.toHaveBeenCalled()
  })

  it('bloquea ranked cuando el 20% no llega a 10 preguntas', async () => {
    readQuizBankMock.mockResolvedValue(makeBank(45))

    const { POST } = await import('./route')
    const response = await POST(new Request('http://campus.test/api/quiz/ranked/start', {
      method: 'POST',
      body: JSON.stringify({ subject: 'algoritmos', bankId: 'bank-1', name: 'Tomi' }),
    }))

    expect(response.status).toBe(400)
    expect(rankedCreateMock).not.toHaveBeenCalled()
  })
})
