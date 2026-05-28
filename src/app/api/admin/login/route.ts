import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  clearAdminLoginAttempts,
  getAdminLoginAttemptStatus,
  registerAdminLoginFailure,
} from '@/lib/admin-login-rate-limit'
import { getClientIp } from '@/lib/ratelimit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
})

function buildRateLimitMessage(retryAfterSeconds: number) {
  const retryAfterMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60))
  return `Demasiados intentos. Esperá ${retryAfterMinutes} minuto${retryAfterMinutes === 1 ? '' : 's'} antes de volver a intentar.`
}

function sanitizeRedirect(raw?: string) {
  const fallback = '/'
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  if (raw === '/admin' || raw === '/admin/') return fallback
  return raw
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Revisá los datos ingresados e intentá de nuevo.' },
      { status: 400 },
    )
  }

  const { email, password, redirectTo } = parsed.data
  const ip = getClientIp(request.headers)
  const attemptStatus = await getAdminLoginAttemptStatus(email, ip)

  if (!attemptStatus.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: buildRateLimitMessage(attemptStatus.retryAfterSeconds),
        retryAfterSeconds: attemptStatus.retryAfterSeconds,
      },
      { status: 429 },
    )
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const failureStatus = await registerAdminLoginFailure(email, ip)

    if (!failureStatus.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: buildRateLimitMessage(failureStatus.retryAfterSeconds),
          retryAfterSeconds: failureStatus.retryAfterSeconds,
        },
        { status: 429 },
      )
    }

    return NextResponse.json(
      {
        ok: false,
        message: 'Correo o contraseña incorrectos.',
      },
      { status: 401 },
    )
  }

  await clearAdminLoginAttempts(email, ip)

  return NextResponse.json({
    ok: true,
    redirectTo: sanitizeRedirect(redirectTo),
  })
}
