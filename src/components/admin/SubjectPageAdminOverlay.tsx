'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminControls } from './AdminControls'
import { SubjectModal } from './SubjectModal'
import { EventModal } from './EventModal'
import { ApunteModal } from './ApunteModal'
import { QuizBankModal } from './QuizBankModal'
import { EditDriveModal } from './EditDriveModal'
import { deleteEvento, deleteApunte } from '@/app/admin/actions'

interface TipoEvento {
  id: string
  nombre: string
}

interface SubjectPageAdminOverlayProps {
  subject: {
    id: string
    slug: string
    nombre: string
    descripcion?: string
    driveUrl?: string | null
  }
  agendaId: string
  yearId?: string
  yearSlug?: string
  tiposEvento: TipoEvento[]
}

import { useEffect } from 'react'

interface AdminTriggerButtonProps {
  action: 'upload-bank' | 'new-apunte' | 'new-event' | 'edit-drive'
  className?: string
  children: React.ReactNode
}

export function AdminTriggerButton({ action, className, children }: AdminTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent(`open-admin-modal-${action}`))
      }}
      className={className}
    >
      {children}
    </button>
  )
}

/**
 * Island de cliente: monta todos los controles de edición admin sobre la vista
 * pública de /materia/[slug]. Invisible para anónimos (AdminControls hace el gate).
 */
export function SubjectPageAdminOverlay({
  subject,
  agendaId,
  yearId,
  yearSlug,
  tiposEvento,
}: SubjectPageAdminOverlayProps) {
  const [editSubjectOpen, setEditSubjectOpen] = useState(false)
  const [newEventOpen, setNewEventOpen] = useState(false)
  const [newApunteOpen, setNewApunteOpen] = useState(false)
  const [uploadBankOpen, setUploadBankOpen] = useState(false)
  const [uploadBankKey, setUploadBankKey] = useState(0)
  const [editDriveOpen, setEditDriveOpen] = useState(false)

  useEffect(() => {
    const handleUploadBank = () => {
      setUploadBankOpen(true)
      setUploadBankKey((k) => k + 1)
    }
    const handleNewApunte = () => setNewApunteOpen(true)
    const handleNewEvent = () => setNewEventOpen(true)
    const handleEditDrive = () => setEditDriveOpen(true)

    window.addEventListener('open-admin-modal-upload-bank', handleUploadBank)
    window.addEventListener('open-admin-modal-new-apunte', handleNewApunte)
    window.addEventListener('open-admin-modal-new-event', handleNewEvent)
    window.addEventListener('open-admin-modal-edit-drive', handleEditDrive)

    return () => {
      window.removeEventListener('open-admin-modal-upload-bank', handleUploadBank)
      window.removeEventListener('open-admin-modal-new-apunte', handleNewApunte)
      window.removeEventListener('open-admin-modal-new-event', handleNewEvent)
      window.removeEventListener('open-admin-modal-edit-drive', handleEditDrive)
    }
  }, [])

  return (
    <AdminControls yearId={yearId} yearSlug={yearSlug}>
      {/* Botones de acción flotante en la parte superior */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => { setUploadBankOpen(true); setUploadBankKey((k) => k + 1) }}
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Subir banco de preguntas
        </button>
        <button
          type="button"
          onClick={() => setNewApunteOpen(true)}
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo apunte
        </button>
        <button
          type="button"
          onClick={() => setNewEventOpen(true)}
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo evento
        </button>
        <button
          type="button"
          onClick={() => setEditSubjectOpen(true)}
          className="inline-flex items-center gap-2 rounded border border-white/12 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar materia
        </button>
      </div>

      {/* Modales */}
      <SubjectModal
        open={editSubjectOpen}
        onClose={() => setEditSubjectOpen(false)}
        subject={{ id: subject.id, nombre: subject.nombre, descripcion: subject.descripcion, driveUrl: subject.driveUrl }}
        yearId={yearId}
      />

      <EventModal
        key={`${agendaId}-${subject.slug}-${newEventOpen}`}
        open={newEventOpen}
        onClose={() => setNewEventOpen(false)}
        agendaId={agendaId}
        subjectSlug={subject.slug}
        tiposEvento={tiposEvento}
      />

      <ApunteModal
        open={newApunteOpen}
        onClose={() => setNewApunteOpen(false)}
        subjectId={subject.id}
        subjectSlug={subject.slug}
      />

      <QuizBankModal
        key={uploadBankKey}
        open={uploadBankOpen}
        onClose={() => setUploadBankOpen(false)}
        subjectSlug={subject.slug}
      />

      <EditDriveModal
        key={`${subject.id}-${subject.driveUrl ?? ''}-${editDriveOpen}`}
        open={editDriveOpen}
        onClose={() => setEditDriveOpen(false)}
        subjectId={subject.id}
        subjectSlug={subject.slug}
        subjectNombre={subject.nombre}
        currentDriveUrl={subject.driveUrl}
      />
    </AdminControls>
  )
}

// ---------------------------------------------------------------------------
// Botón de borrado inline para un evento individual (usado en la lista de eventos)
// ---------------------------------------------------------------------------
interface DeleteEventoButtonProps {
  eventoId: string
  subjectSlug: string
  yearId?: string
  yearSlug?: string
}

export function DeleteEventoButton({
  eventoId,
  subjectSlug,
  yearId,
  yearSlug,
}: DeleteEventoButtonProps) {
  return (
    <AdminControls yearId={yearId} yearSlug={yearSlug}>
      <form action={deleteEvento}>
        <input type="hidden" name="id" value={eventoId} />
        <input type="hidden" name="subjectSlug" value={subjectSlug} />
        <button
          type="submit"
          title="Eliminar evento"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-rose-400/60 transition-colors hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </form>
    </AdminControls>
  )
}

// ---------------------------------------------------------------------------
// Botón de borrado inline para un apunte individual
// ---------------------------------------------------------------------------
interface DeleteApunteButtonProps {
  apunteId: string
  subjectSlug: string
  yearId?: string
  yearSlug?: string
}

export function DeleteApunteButton({
  apunteId,
  subjectSlug,
  yearId,
  yearSlug,
}: DeleteApunteButtonProps) {
  return (
    <AdminControls yearId={yearId} yearSlug={yearSlug}>
      <form action={deleteApunte}>
        <input type="hidden" name="id" value={apunteId} />
        <input type="hidden" name="subjectSlug" value={subjectSlug} />
        <button
          type="submit"
          title="Eliminar apunte"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-rose-400/60 transition-colors hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </form>
    </AdminControls>
  )
}
