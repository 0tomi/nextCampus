'use client'

import { useEffect, useActionState } from 'react'
import { Modal } from '@/components/ui/Modal'
import {
  createApunteAction,
  type ApunteActionState,
} from '@/app/admin/actions'

interface ApunteModalProps {
  open: boolean
  onClose: () => void
  subjectId: string
  subjectSlug: string
  onSuccess?: () => void
}

const emptyState: ApunteActionState = { ok: false, message: '' }

export function ApunteModal({
  open,
  onClose,
  subjectId,
  subjectSlug,
  onSuccess,
}: ApunteModalProps) {
  const [state, formAction, pending] = useActionState(createApunteAction, emptyState)

  useEffect(() => {
    if (state.ok) {
      onSuccess?.()
      onClose()
    }
  }, [state.ok, onClose, onSuccess])

  return (
    <Modal open={open} onClose={onClose} title="Nuevo apunte">
      <form action={formAction} className="space-y-4" encType="multipart/form-data">
        <input type="hidden" name="subjectId" value={subjectId} />
        <input type="hidden" name="subjectSlug" value={subjectSlug} />

        <div className="space-y-1">
          <label
            htmlFor="apunte-titulo"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Título
          </label>
          <input
            id="apunte-titulo"
            type="text"
            name="titulo"
            required
            placeholder="Ej: Resumen Unidad 3"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="apunte-descripcion"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Descripción{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <textarea
            id="apunte-descripcion"
            name="descripcionHtml"
            rows={3}
            placeholder="Descripción del contenido"
            className="w-full resize-none rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="apunte-pdf"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Archivo PDF{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <input
            id="apunte-pdf"
            type="file"
            name="pdf"
            accept="application/pdf"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
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
            className="rounded border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {pending ? 'Guardando…' : 'Crear apunte'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
