'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { updateSubjectDriveUrlAction } from '@/app/admin/actions'

interface EditDriveModalProps {
  open: boolean
  onClose: () => void
  subjectId: string
  subjectSlug: string
  subjectNombre: string
  currentDriveUrl?: string | null
  onSuccess?: () => void
}

export function EditDriveModal({
  open,
  onClose,
  subjectId,
  subjectSlug,
  subjectNombre,
  currentDriveUrl = '',
  onSuccess,
}: EditDriveModalProps) {
  const [driveUrl, setDriveUrl] = useState(currentDriveUrl ?? '')
  const [pending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')

    startTransition(async () => {
      try {
        const res = await updateSubjectDriveUrlAction(
          subjectId,
          driveUrl,
          subjectSlug,
        )
        if (res.ok) {
          onSuccess?.()
          onClose()
        } else {
          setErrorMsg(res.message)
        }
      } catch {
        setErrorMsg('Ocurrió un error inesperado. Intentalo de nuevo.')
      }
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar enlace de Drive">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-white/50">
            Modificando el enlace de contenido para{' '}
            <strong className="text-white">{subjectNombre}</strong>.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="drive-url-input"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Enlace de Google Drive
          </label>
          <input
            id="drive-url-input"
            type="url"
            name="driveUrl"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-0"
          />
        </div>

        {errorMsg && (
          <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-2 text-sm font-bold text-black shadow-lg transition-transform active:scale-[0.98] hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {pending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
