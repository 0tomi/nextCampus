'use client'

import { useEffect, useActionState } from 'react'
import { Modal } from '@/components/ui/Modal'
import {
  createSubjectAction,
  updateSubjectAction,
  type SubjectActionState,
} from '@/app/admin/actions'

interface SubjectModalProps {
  open: boolean
  onClose: () => void
  /** Si se pasa, el modal edita esa materia. Si es undefined, crea una nueva. */
  subject?: {
    id: string
    nombre: string
    descripcion?: string
  }
  /** ID del año al que pertenece la materia (requerido para crear). */
  yearId?: string
  onSuccess?: () => void
}

const emptyState: SubjectActionState = { ok: false, message: '' }

export function SubjectModal({
  open,
  onClose,
  subject,
  yearId,
  onSuccess,
}: SubjectModalProps) {
  const isEdit = !!subject

  const action = isEdit ? updateSubjectAction : createSubjectAction

  const [state, formAction, pending] = useActionState(action, emptyState)

  useEffect(() => {
    if (state.ok) {
      onSuccess?.()
      onClose()
    }
  }, [state.ok, onClose, onSuccess])

  const title = isEdit ? 'Editar materia' : 'Nueva materia'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form action={formAction} className="space-y-4">
        {isEdit ? (
          <input type="hidden" name="id" value={subject.id} />
        ) : (
          <input type="hidden" name="yearId" value={yearId ?? ''} />
        )}

        <div className="space-y-1">
          <label
            htmlFor="subject-nombre"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Nombre
          </label>
          <input
            id="subject-nombre"
            type="text"
            name="nombre"
            required
            defaultValue={subject?.nombre ?? ''}
            placeholder="Ej: Algoritmos y Estructuras de Datos"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="subject-descripcion"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Descripción{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <textarea
            id="subject-descripcion"
            name="descripcion"
            rows={3}
            defaultValue={subject?.descripcion ?? ''}
            placeholder="Breve descripción de la materia"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none resize-none"
          />
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
            {pending
              ? 'Guardando…'
              : isEdit
                ? 'Guardar cambios'
                : 'Crear materia'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
