'use client'

import { Pencil } from 'lucide-react'
import type { ApunteFull } from './ApunteModal'

interface EditApunteButtonProps {
  apunte: ApunteFull
  yearId?: string
  yearSlug?: string
}

/**
 * Botón inline que abre ApunteModal en modo edición.
 * Dispara el CustomEvent 'open-admin-modal-edit-apunte' con el apunte como detail.
 * SubjectPageAdminOverlay escucha el evento y abre el modal con la data correcta.
 */
export function EditApunteButton({ apunte }: EditApunteButtonProps) {
  const editApunte = () => {
    window.dispatchEvent(
      new CustomEvent('open-admin-modal-edit-apunte', { detail: { apunte } }),
    )
  }

  return (
    <button
      type="button"
      onClick={editApunte}
      title="Editar apunte"
      className="inline-flex size-7 items-center justify-center rounded text-white/40 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
    >
      <Pencil className="size-3.5" />
    </button>
  )
}
