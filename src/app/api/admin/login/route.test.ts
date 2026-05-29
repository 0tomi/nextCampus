import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminLoginAttemptStatusMock = vi.fn()
const registerAdminLoginFailureMock = vi.fn()
const clearAdminLoginAttemptsMock = vi.fn()
const getClientIpMock = vi.fn()
const createSupabaseServerClientMock = vi.fn()
const signInWithPasswordMock = vi.fn()

vi.mock('@/lib/admin-login-rate-limit', () => ({
  getAdminLoginAttemptStatus: getAdminLoginAttemptStatusMock,
  registerAdminLoginFailure: registerAdminLoginFailureMock,
  clearAdminLoginAttempts: clearAdminLoginAttemptsMock,
}))

vi.mock('@/lib/ratelimit', () => ({
  getClientIp: getClientIpMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}))

beforeEach(() => {
  vi.clearAllMocks()
  signInWithPasswordMock.mockResolvedValue({ error: null })
  createSupabaseServerClientMock.mockResolvedValue({
    auth: {
      signInWithPassword: signInWithPasswordMock,
    },
  })
  getClientIpMock.mockReturnValue('203.0.113.10')
  getAdminLoginAttemptStatusMock.mockResolvedValue({
    allowed: true,
    remaining: 10,
    retryAfterSeconds: 0,
    rateLimitEnabled: true,
  })
  registerAdminLoginFailureMock.mockResolvedValue({
    allowed: true,
    remaining: 9,
    retryAfterSeconds: 0,
    rateLimitEnabled: true,
  })
})

describe('admin login route', () => {
  it('devuelve 429 con mensaje claro cuando el acceso ya está bloqueado', async () => {
    getAdminLoginAttemptStatusMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 900,
      rateLimitEnabled: true,
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@campus.test',
          password: 'incorrecta',
        }),
      }),
    )

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'Demasiados intentos. Esperá 15 minutos antes de volver a intentar.',
      retryAfterSeconds: 900,
    })
    expect(signInWithPasswordMock).not.toHaveBeenCalled()
  })

  it('registra la sesión y sanitiza el redirect al completar el login', async () => {
    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@campus.test',
          password: 'valida123',
          redirectTo: '//evil.example',
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectTo: '/',
    })
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'admin@campus.test',
      password: 'valida123',
    })
    expect(clearAdminLoginAttemptsMock).toHaveBeenCalledWith('admin@campus.test', '203.0.113.10')
  })

  it('incrementa el contador al fallar credenciales', async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: new Error('invalid login credentials'),
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@campus.test',
          password: 'incorrecta',
        }),
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'Correo o contraseña incorrectos.',
    })
    expect(registerAdminLoginFailureMock).toHaveBeenCalledWith(
      'admin@campus.test',
      '203.0.113.10',
    )
  })

  it('no consume intentos cuando el servicio devuelve un error transitorio', async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: new Error('Database temporarily unavailable'),
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@campus.test',
          password: 'incorrecta',
        }),
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'No pudimos validar el acceso ahora. Intentá de nuevo en unos minutos.',
    })
    expect(registerAdminLoginFailureMock).not.toHaveBeenCalled()
  })
})
