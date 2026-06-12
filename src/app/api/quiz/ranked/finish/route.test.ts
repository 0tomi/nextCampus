import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeQuestionId, type QuizBankFile } from '@/lib/domain/quiz-bank'

// El route calcula la duración contra el reloj real y el fixture usa
// startedAt fijo: sin congelar el reloj, los intentos "recientes" envejecen
// con el calendario y el techo de duración los invalidaría solos.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-06-02T10:05:00.000Z') })
})

afterAll(() => {
  vi.useRealTimers()
})

const rankedFindFirstMock = vi.fn()
const rankedUpdateMock = vi.fn()
const getSubjectQuizMetaMock = vi.fn()
const readQuizBankMock = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    rankedQuizAttempt: {
      findFirst: rankedFindFirstMock,
      update: rankedUpdateMock,
    },
  },
}))
vi.mock('@/lib/queries', () => ({
  getSubjectQuizMeta: getSubjectQuizMetaMock,
}))
vi.mock('@/lib/storage', () => ({
  readQuizBank: readQuizBankMock,
}))

const questionIds = [makeQuestionId('bank-1', 0, 0), makeQuestionId('bank-1', 0, 1)]

const bank: QuizBankFile = {
  title: 'Banco ranked',
  units: [
    {
      name: 'Unidad 1',
      questions: [
        { type: 'single', question: 'Pregunta 1', options: ['A', 'B'], answer: 1, explanation: 'B' },
        { type: 'multiple', question: 'Pregunta 2', options: ['A', 'B', 'C'], answer: [0, 2], explanation: 'A y C' },
      ],
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  getSubjectQuizMetaMock.mockResolvedValue({ id: 'subject-1', slug: 'algoritmos', year: { slug: 'primero' } })
  readQuizBankMock.mockResolvedValue(bank)
  rankedUpdateMock.mockResolvedValue({})
  rankedFindFirstMock.mockResolvedValue({
    id: 'attempt-1',
    subjectId: 'subject-1',
    bankId: 'bank-1',
    questionIds,
    totalQuestions: questionIds.length,
    startedAt: new Date('2026-06-02T10:00:00.000Z'),
    finishedAt: null,
    invalidatedAt: null,
    invalidReason: null,
  })
})

describe('POST /api/quiz/ranked/finish', () => {
  it('corrige solo las preguntas del intento y lo marca válido para el top', async () => {
    const { POST } = await import('./route')
    const response = await POST(new Request('http://campus.test/api/quiz/ranked/finish', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'algoritmos',
        attemptId: 'attempt-1',
        answers: [
          { id: questionIds[0], answer: 1 },
          { id: questionIds[1], answer: [2, 0] },
          { id: makeQuestionId('bank-1', 0, 99), answer: 0 },
        ],
      }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.resultados).toHaveLength(2)
    expect(body.ranked).toMatchObject({ validForRanking: true, correctAnswers: 2, totalQuestions: 2, percentage: 100 })
    expect(rankedUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attempt-1' },
      data: expect.objectContaining({ status: 'VALID', correctAnswers: 2, percentage: 100 }),
    }))
  })



  it('respeta la invalidación local si la entrega llega antes que el evento previo', async () => {
    const { POST } = await import('./route')
    const response = await POST(new Request('http://campus.test/api/quiz/ranked/finish', {
      method: 'POST',
      body: JSON.stringify({ subject: 'algoritmos', attemptId: 'attempt-1', clientInvalidated: true, answers: [] }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ranked.validForRanking).toBe(false)
    expect(rankedUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'INVALID',
        invalidReason: 'client_invalidated',
        invalidatedAt: expect.any(Date),
      }),
    }))
  })

  it('permite terminar un intento invalidado pero lo deja fuera del top', async () => {
    rankedFindFirstMock.mockResolvedValue({
      id: 'attempt-1',
      subjectId: 'subject-1',
      bankId: 'bank-1',
      questionIds,
      totalQuestions: questionIds.length,
      startedAt: new Date('2026-06-02T10:00:00.000Z'),
      finishedAt: null,
      invalidatedAt: new Date('2026-06-02T10:01:00.000Z'),
      invalidReason: 'fullscreen_exit',
    })

    const { POST } = await import('./route')
    const response = await POST(new Request('http://campus.test/api/quiz/ranked/finish', {
      method: 'POST',
      body: JSON.stringify({ subject: 'algoritmos', attemptId: 'attempt-1', answers: [] }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ranked.validForRanking).toBe(false)
    expect(rankedUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'INVALID' }),
    }))
  })

  it('invalida para el ranking un intento que superó el techo de duración, pero igual lo corrige', async () => {
    rankedFindFirstMock.mockResolvedValue({
      id: 'attempt-1',
      subjectId: 'subject-1',
      bankId: 'bank-1',
      questionIds,
      totalQuestions: questionIds.length,
      // 24 horas antes del "ahora" congelado: muy por encima del presupuesto
      // (2 preguntas * 300s + 600s = 1200s).
      startedAt: new Date('2026-06-01T10:05:00.000Z'),
      finishedAt: null,
      invalidatedAt: null,
      invalidReason: null,
    })

    const { POST } = await import('./route')
    const response = await POST(new Request('http://campus.test/api/quiz/ranked/finish', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'algoritmos',
        attemptId: 'attempt-1',
        answers: [{ id: questionIds[0], answer: 1 }],
      }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.resultados).toHaveLength(2)
    expect(body.ranked.validForRanking).toBe(false)
    expect(body.ranked.invalidReason).toBe('duration_exceeded')
    expect(rankedUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'INVALID',
        invalidReason: 'duration_exceeded',
        invalidatedAt: expect.any(Date),
      }),
    }))
  })

  it('mantiene válido un intento dentro del presupuesto de tiempo', async () => {
    const { POST } = await import('./route')
    const response = await POST(new Request('http://campus.test/api/quiz/ranked/finish', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'algoritmos',
        attemptId: 'attempt-1',
        answers: [{ id: questionIds[0], answer: 1 }],
      }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ranked.validForRanking).toBe(true)
    expect(body.ranked.durationSeconds).toBe(300)
    expect(rankedUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'VALID', invalidReason: null }),
    }))
  })
})
