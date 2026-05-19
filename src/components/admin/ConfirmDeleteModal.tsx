'use client'

import { useState, useTransition, useEffect } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import {
  deleteYearAction,
  deleteSubjectAction,
  getYearDeleteImpactAction,
  getSubjectDeleteImpactAction,
} from '@/app/admin/actions'
import type { YearDeleteImpact, SubjectDeleteImpact } from '@/lib/queries'

// ---------------------------------------------------------------------------
// Modal de confirmación para eliminar un año
// ---------------------------------------------------------------------------

interface ConfirmDeleteYearModalProps {
  open: boolean
  onClose: () => void
  year: { id: string; nombre: string }
  onSuccess?: () => void
}

export function ConfirmDeleteYearModal({
  open,
  onClose,
  year,
  onSuccess,
}: ConfirmDeleteYearModalProps) {
  const [impact, setImpact] = useState<YearDeleteImpact | null>(null)
  const [isPending, startTransition] = useTransition()

  // `impact === null` while open means we're loading
  const loadingImpact = open && impact === null

  useEffect(() => {
    if (!open) return
    const fd = new FormData()
    fd.set('id', year.id)
    void getYearDeleteImpactAction(fd).then((result) => {
      setImpact(result)
    })
  }, [open, year.id])

  const handleConfirm = () => {
    const fd = new FormData()
    fd.set('id', year.id)
    startTransition(async () => {
      await deleteYearAction(fd)
      onSuccess?.()
      onClose()
      setImpact(null)
    })
  }

  const handleClose = () => {
    onClose()
    setImpact(null)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Eliminar año">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded border border-amber-400/20 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-200">
            Esta acción es permanente y no se puede deshacer.
          </p>
        </div>

        <p className="text-sm text-white/70">
          Estás por eliminar el año{' '}
          <span className="font-semibold text-white">{year.nombre}</span> y todo
          su contenido.
        </p>

        {loadingImpact && (
          <p className="text-sm text-white/40">Calculando contenido…</p>
        )}

        {impact && (
          <ul className="space-y-1 rounded border border-white/6 bg-surface-0 px-4 py-3">
            <li className="text-sm text-white/60">
              <span className="font-semibold text-white">
                {impact.subjectsCount}
              </span>{' '}
              {impact.subjectsCount === 1 ? 'materia' : 'materias'}
            </li>
            <li className="text-sm text-white/60">
              <span className="font-semibold text-white">
                {impact.eventosCount}
              </span>{' '}
              {impact.eventosCount === 1 ? 'evento' : 'eventos'} en la agenda
            </li>
            <li className="text-sm text-white/60">
              <span className="font-semibold text-white">
                {impact.apuntesCount}
              </span>{' '}
              {impact.apuntesCount === 1 ? 'apunte' : 'apuntes'}
            </li>
            {impact.pdfCount > 0 && (
              <li className="text-sm text-white/60">
                <span className="font-semibold text-white">
                  {impact.pdfCount}
                </span>{' '}
                {impact.pdfCount === 1
                  ? 'archivo adjunto'
                  : 'archivos adjuntos'}
              </li>
            )}
            {impact.bancosCount > 0 && (
              <li className="text-sm text-white/60">
                <span className="font-semibold text-white">
                  {impact.bancosCount}
                </span>{' '}
                {impact.bancosCount === 1
                  ? 'banco de preguntas'
                  : 'bancos de preguntas'}
              </li>
            )}
          </ul>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="rounded border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || loadingImpact}
            className="inline-flex items-center gap-2 rounded bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:bg-rose-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? 'Eliminando…' : 'Eliminar año'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Modal de confirmación para eliminar una materia
// ---------------------------------------------------------------------------

interface ConfirmDeleteSubjectModalProps {
  open: boolean
  onClose: () => void
  subject: { id: string; nombre: string }
  onSuccess?: () => void
}

export function ConfirmDeleteSubjectModal({
  open,
  onClose,
  subject,
  onSuccess,
}: ConfirmDeleteSubjectModalProps) {
  const [impact, setImpact] = useState<SubjectDeleteImpact | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadingImpact = open && impact === null

  useEffect(() => {
    if (!open) return
    const fd = new FormData()
    fd.set('id', subject.id)
    void getSubjectDeleteImpactAction(fd).then((result) => {
      setImpact(result)
    })
  }, [open, subject.id])

  const handleConfirm = () => {
    const fd = new FormData()
    fd.set('id', subject.id)
    startTransition(async () => {
      await deleteSubjectAction(fd)
      onSuccess?.()
      onClose()
      setImpact(null)
    })
  }

  const handleClose = () => {
    onClose()
    setImpact(null)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Eliminar materia">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded border border-amber-400/20 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-200">
            Esta acción es permanente y no se puede deshacer.
          </p>
        </div>

        <p className="text-sm text-white/70">
          Estás por eliminar la materia{' '}
          <span className="font-semibold text-white">{subject.nombre}</span> y
          todo su contenido.
        </p>

        {loadingImpact && (
          <p className="text-sm text-white/40">Calculando contenido…</p>
        )}

        {impact && (
          <ul className="space-y-1 rounded border border-white/6 bg-surface-0 px-4 py-3">
            <li className="text-sm text-white/60">
              <span className="font-semibold text-white">
                {impact.eventosCount}
              </span>{' '}
              {impact.eventosCount === 1 ? 'evento' : 'eventos'} en la agenda
            </li>
            <li className="text-sm text-white/60">
              <span className="font-semibold text-white">
                {impact.apuntesCount}
              </span>{' '}
              {impact.apuntesCount === 1 ? 'apunte' : 'apuntes'}
            </li>
            {impact.pdfCount > 0 && (
              <li className="text-sm text-white/60">
                <span className="font-semibold text-white">
                  {impact.pdfCount}
                </span>{' '}
                {impact.pdfCount === 1
                  ? 'archivo adjunto'
                  : 'archivos adjuntos'}
              </li>
            )}
            {impact.bancosCount > 0 && (
              <li className="text-sm text-white/60">
                <span className="font-semibold text-white">
                  {impact.bancosCount}
                </span>{' '}
                {impact.bancosCount === 1
                  ? 'banco de preguntas'
                  : 'bancos de preguntas'}
              </li>
            )}
          </ul>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="rounded border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || loadingImpact}
            className="inline-flex items-center gap-2 rounded bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:bg-rose-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? 'Eliminando…' : 'Eliminar materia'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
