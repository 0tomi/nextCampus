import { beforeEach, describe, expect, it, vi } from 'vitest'

const { queryRawMock, getSubjectQuizMetaMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  getSubjectQuizMetaMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}))
vi.mock('@/lib/queries', () => ({
  getSubjectQuizMeta: getSubjectQuizMetaMock,
}))

import { GET } from './route'

function buildRequest(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  return new Request(`http://localhost/api/quiz/ranked/history?${qs}`)
}

function historyRow(overrides: Record<string, unknown> = {}) {
  return {
    participantName: 'Estudiante Spike',
    correctAnswers: 8,
    totalQuestions: 10,
    percentage: 80,
    durationSeconds: 510,
    finishedAt: new Date('2026-06-15T10:08:30.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  getSubjectQuizMetaMock.mockResolvedValue({ id: 'subject-1', slug: 'algoritmos', year: { slug: 'primero' } })
})

describe('GET /api/quiz/ranked/history', () => {
  it('rechaza parámetros inválidos (falta el nombre)', async () => {
    const res = await GET(buildRequest({ subject: 'algoritmos', bank: 'bank-1' }))
    expect(res.status).toBe(400)
    expect(getSubjectQuizMetaMock).not.toHaveBeenCalled()
  })

  it('devuelve historial vacío cuando el nombre normaliza a vacío, sin tocar la base', async () => {
    const res = await GET(buildRequest({ subject: 'algoritmos', bank: 'bank-1', name: '...' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.attempts).toEqual([])
    expect(body.summary.trend).toBe('empty')
    expect(getSubjectQuizMetaMock).not.toHaveBeenCalled()
    expect(queryRawMock).not.toHaveBeenCalled()
  })

  it('responde 404 cuando la materia no existe', async () => {
    getSubjectQuizMetaMock.mockResolvedValue(null)
    const res = await GET(buildRequest({ subject: 'inexistente', bank: 'bank-1', name: 'Juan' }))
    expect(res.status).toBe(404)
  })

  it('deriva resumen, posición e historial recortado a partir de los intentos válidos', async () => {
    queryRawMock
      .mockResolvedValueOnce([
        historyRow({ percentage: 80, durationSeconds: 510, finishedAt: new Date('2026-06-15T10:00:00.000Z') }),
        historyRow({ percentage: 90, durationSeconds: 540, finishedAt: new Date('2026-06-08T10:00:00.000Z') }),
        historyRow({ percentage: 70, durationSeconds: 600, finishedAt: new Date('2026-06-01T10:00:00.000Z') }),
      ])
      .mockResolvedValueOnce([{ position: BigInt(2) }])

    const res = await GET(buildRequest({ subject: 'algoritmos', bank: 'bank-1', name: ' Estudiante Spike ' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.participantName).toBe('Estudiante Spike')
    expect(body.summary).toMatchObject({
      bestPercentage: 90,
      bestDurationSeconds: 540,
      latestPercentage: 80,
      changeVsPrevious: -10,
      trend: 'declined',
      position: 2,
    })
    expect(body.summary.message).toContain('10 puntos menos')
    expect(body.attempts).toHaveLength(3)
    // El historial vuelve ordenado por fecha descendente.
    expect(body.attempts[0].finishedAt).toBe('2026-06-15T10:00:00.000Z')
  })

  it('devuelve vacío cuando no hay intentos válidos para ese nombre', async () => {
    queryRawMock.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    const res = await GET(buildRequest({ subject: 'algoritmos', bank: 'bank-1', name: 'Nadie' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.attempts).toEqual([])
    expect(body.summary.position).toBeNull()
    expect(body.summary.trend).toBe('empty')
  })
})
