'use client'

import { useState } from 'react'
import { ArrowRight, Shield } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { DarkCard } from '@/components/ui/DarkCard'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (authError) {
      setError('Credenciales inválidas')
      return
    }
    router.push(searchParams.get('redirectTo') ?? '/admin')
    router.refresh()
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
            className="block w-full rounded-none border border-white/5 bg-[#0a0a0a] px-3 py-3 text-sm text-white placeholder:text-white/28 focus:border-white/10 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block w-full rounded-none border border-white/5 bg-[#0a0a0a] px-3 py-3 text-sm text-white placeholder:text-white/28 focus:border-white/10 focus:outline-none"
          />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-none border border-violet-400/20 bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_24px_80px_rgba(109,40,217,0.28)] transition hover:from-violet-400 hover:to-purple-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </DarkCard>
    </div>
  )
}
