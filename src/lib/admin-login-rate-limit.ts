import { createHash } from 'node:crypto'
import { redis } from '@/lib/ratelimit'

export const ADMIN_LOGIN_MAX_ATTEMPTS = 10
export const ADMIN_LOGIN_WINDOW_SECONDS = 15 * 60
export const ADMIN_LOGIN_BLOCK_SECONDS = 15 * 60

type LoginAttemptStore = {
  del(...keys: string[]): Promise<unknown>
  expire(key: string, seconds: number): Promise<unknown>
  get<TData>(key: string): Promise<TData | null>
  incr(key: string): Promise<number>
  set(key: string, value: string, options?: { ex?: number }): Promise<unknown>
  ttl(key: string): Promise<number>
}

type AdminLoginKeyPair = {
  blockKey: string
  countKey: string
}

export type AdminLoginAttemptStatus =
  | {
      allowed: true
      remaining: number
      retryAfterSeconds: 0
      rateLimitEnabled: boolean
    }
  | {
      allowed: false
      remaining: 0
      retryAfterSeconds: number
      rateLimitEnabled: boolean
    }

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function buildAdminLoginKeys(email: string, ip: string): AdminLoginKeyPair {
  const emailHash = createHash('sha256').update(normalizeEmail(email)).digest('hex')
  const ipHash = createHash('sha256').update(ip.trim()).digest('hex')
  const prefix = `security:admin-login:${emailHash}:${ipHash}`

  return {
    countKey: `${prefix}:count`,
    blockKey: `${prefix}:block`,
  }
}

function enabledStatus(): AdminLoginAttemptStatus {
  return {
    allowed: true,
    remaining: ADMIN_LOGIN_MAX_ATTEMPTS,
    retryAfterSeconds: 0,
    rateLimitEnabled: false,
  }
}

async function readBlockedStatus(
  store: LoginAttemptStore | null,
  keys: AdminLoginKeyPair,
): Promise<AdminLoginAttemptStatus | null> {
  if (!store) return enabledStatus()

  const ttl = await store.ttl(keys.blockKey)
  if (ttl <= 0) return null

  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: ttl,
    rateLimitEnabled: true,
  }
}

async function getFailureCount(store: LoginAttemptStore, key: string) {
  const value = await store.get<number | string>(key)
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number.parseInt(value, 10) || 0
  return 0
}

export async function getAdminLoginAttemptStatus(
  email: string,
  ip: string,
): Promise<AdminLoginAttemptStatus> {
  return getAdminLoginAttemptStatusWithStore(redis, email, ip)
}

export async function registerAdminLoginFailure(
  email: string,
  ip: string,
): Promise<AdminLoginAttemptStatus> {
  return registerAdminLoginFailureWithStore(redis, email, ip)
}

export async function clearAdminLoginAttempts(email: string, ip: string) {
  await clearAdminLoginAttemptsWithStore(redis, email, ip)
}

export async function getAdminLoginAttemptStatusWithStore(
  store: LoginAttemptStore | null,
  email: string,
  ip: string,
): Promise<AdminLoginAttemptStatus> {
  const keys = buildAdminLoginKeys(email, ip)
  const blocked = await readBlockedStatus(store, keys)
  if (blocked) return blocked

  if (!store) return enabledStatus()

  const failures = await getFailureCount(store, keys.countKey)

  return {
    allowed: true,
    remaining: Math.max(ADMIN_LOGIN_MAX_ATTEMPTS - failures, 0),
    retryAfterSeconds: 0,
    rateLimitEnabled: true,
  }
}

export async function registerAdminLoginFailureWithStore(
  store: LoginAttemptStore | null,
  email: string,
  ip: string,
): Promise<AdminLoginAttemptStatus> {
  const keys = buildAdminLoginKeys(email, ip)
  const blocked = await readBlockedStatus(store, keys)
  if (blocked) return blocked

  if (!store) return enabledStatus()

  const failures = await store.incr(keys.countKey)
  await store.expire(keys.countKey, ADMIN_LOGIN_WINDOW_SECONDS)

  if (failures >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    await store.set(keys.blockKey, '1', { ex: ADMIN_LOGIN_BLOCK_SECONDS })

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: ADMIN_LOGIN_BLOCK_SECONDS,
      rateLimitEnabled: true,
    }
  }

  return {
    allowed: true,
    remaining: Math.max(ADMIN_LOGIN_MAX_ATTEMPTS - failures, 0),
    retryAfterSeconds: 0,
    rateLimitEnabled: true,
  }
}

export async function clearAdminLoginAttemptsWithStore(
  store: LoginAttemptStore | null,
  email: string,
  ip: string,
) {
  if (!store) return

  const keys = buildAdminLoginKeys(email, ip)
  await store.del(keys.countKey, keys.blockKey)
}
