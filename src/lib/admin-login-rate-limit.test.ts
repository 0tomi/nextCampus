import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('./ratelimit', () => ({
  redis: null,
}))
import {
  ADMIN_LOGIN_BLOCK_SECONDS,
  ADMIN_LOGIN_MAX_ATTEMPTS,
  clearAdminLoginAttemptsWithStore,
  getAdminLoginAttemptStatusWithStore,
  registerAdminLoginFailureWithStore,
} from './admin-login-rate-limit'

class MemoryLoginAttemptStore {
  private values = new Map<string, string>()
  private expirations = new Map<string, number>()

  async del(...keys: string[]) {
    for (const key of keys) {
      this.values.delete(key)
      this.expirations.delete(key)
    }
  }

  async expire(key: string, seconds: number) {
    this.expirations.set(key, Date.now() + seconds * 1000)
  }

  async get<TData>(key: string) {
    this.cleanup(key)
    return (this.values.get(key) as TData | undefined) ?? null
  }

  async incr(key: string) {
    this.cleanup(key)
    const nextValue = Number.parseInt(this.values.get(key) ?? '0', 10) + 1
    this.values.set(key, String(nextValue))
    return nextValue
  }

  async set(key: string, value: string, options?: { ex?: number }) {
    this.values.set(key, value)
    if (options?.ex) {
      this.expirations.set(key, Date.now() + options.ex * 1000)
    }
  }

  async ttl(key: string) {
    this.cleanup(key)
    const expiration = this.expirations.get(key)
    if (!expiration) return -2
    return Math.max(1, Math.ceil((expiration - Date.now()) / 1000))
  }

  private cleanup(key: string) {
    const expiration = this.expirations.get(key)
    if (!expiration) return
    if (expiration > Date.now()) return
    this.expirations.delete(key)
    this.values.delete(key)
  }
}

describe('admin login rate limit', () => {
  it('permite intentos hasta el umbral y luego bloquea temporalmente', async () => {
    const store = new MemoryLoginAttemptStore()

    for (let attempt = 1; attempt < ADMIN_LOGIN_MAX_ATTEMPTS; attempt += 1) {
      const result = await registerAdminLoginFailureWithStore(
        store,
        'Admin@Campus.Test',
        '203.0.113.5',
      )

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(ADMIN_LOGIN_MAX_ATTEMPTS - attempt)
    }

    const blockedResult = await registerAdminLoginFailureWithStore(
      store,
      'admin@campus.test',
      '203.0.113.5',
    )

    expect(blockedResult.allowed).toBe(false)
    expect(blockedResult.retryAfterSeconds).toBe(ADMIN_LOGIN_BLOCK_SECONDS)

    const status = await getAdminLoginAttemptStatusWithStore(
      store,
      'admin@campus.test',
      '203.0.113.5',
    )

    expect(status.allowed).toBe(false)
    expect(status.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('limpia el bloqueo cuando el acceso válido se completa', async () => {
    const store = new MemoryLoginAttemptStore()

    for (let attempt = 0; attempt < ADMIN_LOGIN_MAX_ATTEMPTS; attempt += 1) {
      await registerAdminLoginFailureWithStore(store, 'admin@campus.test', '198.51.100.8')
    }

    await clearAdminLoginAttemptsWithStore(store, 'admin@campus.test', '198.51.100.8')

    const status = await getAdminLoginAttemptStatusWithStore(
      store,
      'admin@campus.test',
      '198.51.100.8',
    )

    expect(status).toEqual({
      allowed: true,
      remaining: ADMIN_LOGIN_MAX_ATTEMPTS,
      retryAfterSeconds: 0,
      rateLimitEnabled: true,
    })
  })

  it('si no hay Redis configurado no rompe el acceso', async () => {
    const status = await getAdminLoginAttemptStatusWithStore(
      null,
      'admin@campus.test',
      '198.51.100.9',
    )

    expect(status).toEqual({
      allowed: true,
      remaining: ADMIN_LOGIN_MAX_ATTEMPTS,
      retryAfterSeconds: 0,
      rateLimitEnabled: false,
    })
  })
})
