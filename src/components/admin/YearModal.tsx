'use client'

import { useEffect, useActionState } from 'react'
import { Modal } from '@/components/ui/Modal'
import {
  createYearAction,
  updateYearAction,
  type YearActionState,
} from '@/app/admin/actions'

interface YearModalProps {
  open: boolean
  onClose: () => void
  /** Si se pasa, el modal edita ese año. Si es undefined, crea uno nuevo. */
  year?: {
    id: string
    nombre: string
    orden: number
  }
  /** Se llama cuando la acción termina bien (para cerrar el modal). */
  onSuccess?: () => void
}

const emptyState: YearActionState = { ok: false, message: '' }

export function YearModal({ open, onClose, year, onSuccess }: YearModalProps) {
  const isEdit = !!year

  const action = isEdit ? updateYearAction : createYearAction

  const [state, formAction, pending] = useActionState(action, emptyState)

  // Cerrar y avisar cuando la acción termina exitosamente
  useEffect(() => {
    if (state.ok) {
      onSuccess?.()
      onClose()
    }
  }, [state.ok, onClose, onSuccess])

  const title = isEdit ? 'Editar año' : 'Nuevo año'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={year.id} />}

        <div className="space-y-1">
          <label
            htmlFor="year-nombre"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Nombre
          </label>
          <input
            id="year-nombre"
            type="text"
            name="nombre"
            required
            defaultValue={year?.nombre ?? ''}
            placeholder="Ej: Primer año"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="year-orden"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Orden
          </label>
          <input
            id="year-orden"
            type="number"
            name="orden"
            required
            min={1}
            defaultValue={year?.orden ?? ''}
            placeholder="Ej: 1"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
          <p className="text-[11px] text-white/30">
            Determina el orden en que aparece el año en la lista.
          </p>
        </div>

        {state.message && !state.ok && (
          <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {state.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50"
          >
            {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear año'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
