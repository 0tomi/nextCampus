import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAuditViewerMock = vi.fn()
const auditLogFindManyMock = vi.fn()
const userAccountFindManyMock = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => ({
  requireAuditViewer: requireAuditViewerMock,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: { findMany: auditLogFindManyMock },
    userAccount: { findMany: userAccountFindManyMock },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  auditLogFindManyMock.mockResolvedValue([])
  userAccountFindManyMock.mockResolvedValue([])
})

describe('GET /api/admin/historial', () => {
  it('filtra el historial del Supervisor por sus años', async () => {
    requireAuditViewerMock.mockResolvedValue({
      canManageAllYears: false,
      yearIds: ['year-1', 'year-2'],
    })

    const { GET } = await import('./route')
    const response = await GET(new Request('http://campus.test/api/admin/historial?action=APUNTE_UPDATED'))
    const body = await response.json()

    expect(body).toMatchObject({ items: [], hasMore: false, nextCursor: null })
    expect(auditLogFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          yearId: { in: ['year-1', 'year-2'] },
          action: { in: ['APUNTE_UPDATED'] },
        }),
      }),
    )
  })

  it('no agrega filtro de año para Admin general', async () => {
    requireAuditViewerMock.mockResolvedValue({
      canManageAllYears: true,
      yearIds: [],
    })

    const { GET } = await import('./route')
    await GET(new Request('http://campus.test/api/admin/historial'))

    expect(auditLogFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    )
  })
})

describe('GET /api/admin/historial/users', () => {
  it('acota las personas sugeridas al historial visible por el Supervisor', async () => {
    requireAuditViewerMock.mockResolvedValue({
      canManageAllYears: false,
      yearIds: ['year-1'],
    })

    const { GET } = await import('./users/route')
    await GET(new Request('http://campus.test/api/admin/historial/users?q=tomi'))

    expect(userAccountFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: { contains: 'tomi', mode: 'insensitive' },
          auditLogs: {
            some: {
              yearId: { in: ['year-1'] },
            },
          },
        }),
      }),
    )
  })
})
