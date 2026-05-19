'use client'

import { LogOut } from 'lucide-react'
import { signOutAction } from '@/app/admin/actions'

/**
 * Botón para cerrar sesión. Solo se monta cuando AdminControls confirma
 * que hay una sesión de administrador activa.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/78 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </form>
  )
}
