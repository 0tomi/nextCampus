'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Shield } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DarkCard } from '@/components/ui/DarkCard'

type LoginResponsePayload = {
  message?: string
  ok?: boolean
  redirectTo?: string
  retryAfterSeconds?: number
}

function formatRetryTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes <= 0) {
    return `${seconds} segundo${seconds === 1 ? '' : 's'}`
  }

  if (seconds === 0) {
    return `${minutes} minuto${minutes === 1 ? '' : 's'}`
  }

  return `${minutes} min ${seconds.toString().padStart(2, '0')} s`
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [blockedSeconds, setBlockedSeconds] = useState(0)

  const isBlocked = blockedSeconds > 0

  useEffect(() => {
    if (blockedSeconds <= 0) return

    const timer = window.setInterval(() => {
      setBlockedSeconds((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [blockedSeconds])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isBlocked) return

    setLoading(true)
    setError(null)

    const raw = searchParams.get('redirectTo') ?? '/'

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          redirectTo: raw,
        }),
      })

      const payload = (await response.json().catch(() => null)) as LoginResponsePayload | null

      if (response.status === 429 && payload?.retryAfterSeconds) {
        setBlockedSeconds(payload.retryAfterSeconds)
      }

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? 'No pudimos iniciar sesión. Intentá de nuevo.')
        return
      }

      setBlockedSeconds(0)
      router.push(payload.redirectTo ?? '/')
      router.refresh()
    } catch {
      setError('No pudimos iniciar sesión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative isolate mx-auto flex min-h-[calc(100vh-12rem)] max-w-5xl items-center justify-center overflow-hidden px-4 py-16">
      <div className="absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute right-10 top-16 h-24 w-24 border border-white/10 bg-white/[0.02]" />
      <div className="absolute bottom-16 left-10 h-32 w-32 border border-violet-400/20 bg-violet-500/[0.03]" />
      <div className="absolute left-[18%] top-[28%] h-3 w-3 bg-violet-300/60" />
      <div className="absolute right-[24%] bottom-[28%] h-4 w-4 border border-white/20" />

      <DarkCard className="relative z-10 w-full max-w-md overflow-hidden p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_120px_rgba(76,29,149,0.28)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

        <div className="space-y-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-none border border-violet-400/20 bg-violet-500/10 text-violet-200">
            <Shield className="h-5 w-5" />
          </span>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
              Acceso interno
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              Acceso administrador
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/58">
              Ingresá con tu cuenta habilitada para abrir el panel interno.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || isBlocked}
            className="block w-full rounded-none border border-white/5 bg-[#0a0a0a] px-3 py-3 text-sm text-white placeholder:text-white/28 focus:border-white/10 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || isBlocked}
            className="block w-full rounded-none border border-white/5 bg-[#0a0a0a] px-3 py-3 text-sm text-white placeholder:text-white/28 focus:border-white/10 focus:outline-none"
          />
          {isBlocked ? (
            <div className="relative overflow-hidden rounded-none border border-amber-300/20 bg-gradient-to-br from-amber-400/12 via-[#1a1304] to-rose-400/10 px-4 py-4 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.06),0_18px_50px_rgba(251,191,36,0.08)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center border border-amber-200/20 bg-amber-200/10 text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold tracking-[0.02em] text-amber-50">
                    Acceso pausado
                  </p>
                  <p className="text-sm leading-6 text-amber-100/82">
                    Se excedió el límite de intentos. Por seguridad, esperá un momento y
                    volvé a intentar más tarde.
                  </p>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200/72">
                    Disponible otra vez en {formatRetryTime(blockedSeconds)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || isBlocked}
            className="inline-flex w-full items-center justify-center gap-2 rounded-none border border-violet-400/20 bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_24px_80px_rgba(109,40,217,0.28)] transition hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando…' : isBlocked ? 'Intentá más tarde' : 'Ingresar'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </DarkCard>
    </div>
  )
}
