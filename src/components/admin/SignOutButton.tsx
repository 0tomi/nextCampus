'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { signOutAction } from '@/app/admin/actions/session'

/**
 * Botón para cerrar sesión. Solo se monta cuando AdminControls confirma
 * que hay una sesión de administrador activa.
 */
export function SignOutButton() {
  const [loading, setLoading] = useState(false)

  const handleSignOut = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signOutAction()
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
    window.location.href = '/'
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSignOut(event)
      }}
    >
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/78 transition-colors hover:bg-white/10 hover:text-white cursor-pointer disabled:opacity-50"
      >
        <LogOut className="size-4" />
        {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
    </form>
  )
}
