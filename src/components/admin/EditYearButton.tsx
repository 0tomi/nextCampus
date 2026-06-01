'use client'

import { Pencil } from 'lucide-react'
import { AdminControls } from './AdminControls'

/**
 * Botón para editar el año desde su propia vista (desktop). Solo visible para
 * quienes pueden gestionar la estructura académica (admins y supervisores).
 * Dispara el evento que YearPageAdminOverlay ya escucha para abrir el modal.
 */
export function EditYearButton() {
  return (
    <AdminControls requireAcademicStructure noWrapper>
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new CustomEvent('open-admin-modal-edit-year'))
        }
        className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        title="Editar año"
      >
        <Pencil className="size-4" />
        Editar año
      </button>
    </AdminControls>
  )
}
