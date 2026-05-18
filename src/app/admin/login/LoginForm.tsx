'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ConstructivistCard } from '@/components/shared/ConstructivistCard'

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
    <div className="mx-auto max-w-sm">
      <ConstructivistCard className="space-y-4">
        <h1 className="font-display text-2xl font-extrabold">
          Acceso administrador
        </h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="block w-full border-2 border-ink px-2 py-1"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block w-full border-2 border-ink px-2 py-1"
          />
          {error && <p className="text-sm text-primary">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full border-4 border-ink bg-primary px-4 py-2 font-bold text-paper shadow-hard-sm disabled:opacity-50"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </ConstructivistCard>
    </div>
  )
}
