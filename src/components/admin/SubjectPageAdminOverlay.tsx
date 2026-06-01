'use client'

import { useEffect, useState, useTransition } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminControls } from './AdminControls'
import { SubjectModal } from './SubjectModal'
import { EventModal } from './EventModal'
import { ApunteModal } from './ApunteModal'
import { QuizBankModal } from './QuizBankModal'
import { CommissionModal } from './CommissionModal'
import { deleteEvento, deleteApunteAction } from '@/app/admin/actions'
import type { ApunteFull } from './ApunteModal'
import type { CommissionOption } from '@/lib/commission-preferences'

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
    playlistUrl?: string | null
    playlistEnabled?: boolean
    commissions: readonly CommissionOption[]
    categoriasDisponibles: Array<{ id: string; nombre: string }>
  }
  agendaId: string
  yearId?: string
  yearSlug?: string
  tiposEvento: TipoEvento[]
}

interface AdminTriggerButtonProps {
  action: 'upload-bank' | 'new-apunte' | 'new-event' | 'edit-subject' | 'new-commission'
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
 * pública de la materia. Invisible para anónimos (AdminControls hace el gate).
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
  const [newCommissionOpen, setNewCommissionOpen] = useState(false)
  const [newApunteOpen, setNewApunteOpen] = useState(false)
  const [editingApunte, setEditingApunte] = useState<ApunteFull | null>(null)
  const [uploadBankOpen, setUploadBankOpen] = useState(false)
  const [uploadBankKey, setUploadBankKey] = useState(0)

  useEffect(() => {
    const handleUploadBank = () => {
      setUploadBankOpen(true)
      setUploadBankKey((k) => k + 1)
    }
    const handleNewApunte = () => setNewApunteOpen(true)
    const handleNewEvent = () => setNewEventOpen(true)
    const handleNewCommission = () => setNewCommissionOpen(true)
    const handleEditSubject = () => setEditSubjectOpen(true)
    const handleEditApunte = (e: Event) => {
      const { apunte } = (e as CustomEvent<{ apunte: ApunteFull }>).detail
      setEditingApunte(apunte)
    }

    window.addEventListener('open-admin-modal-upload-bank', handleUploadBank)
    window.addEventListener('open-admin-modal-new-apunte', handleNewApunte)
    window.addEventListener('open-admin-modal-new-event', handleNewEvent)
    window.addEventListener('open-admin-modal-new-commission', handleNewCommission)
    window.addEventListener('open-admin-modal-edit-subject', handleEditSubject)
    window.addEventListener('open-admin-modal-edit-apunte', handleEditApunte)

    return () => {
      window.removeEventListener('open-admin-modal-upload-bank', handleUploadBank)
      window.removeEventListener('open-admin-modal-new-apunte', handleNewApunte)
      window.removeEventListener('open-admin-modal-new-event', handleNewEvent)
      window.removeEventListener('open-admin-modal-new-commission', handleNewCommission)
      window.removeEventListener('open-admin-modal-edit-subject', handleEditSubject)
      window.removeEventListener('open-admin-modal-edit-apunte', handleEditApunte)
    }
  }, [])

  return (
    <AdminControls yearId={yearId} yearSlug={yearSlug} noWrapper>
      {/* Botones de acción flotante en la parte superior - Desktop only */}
      <div className="fixed bottom-6 right-6 z-40 hidden lg:flex flex-col items-end gap-2">
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
        <AdminControls yearId={yearId} yearSlug={yearSlug} requireAcademicStructure noWrapper>
          <button
            type="button"
            onClick={() => setNewCommissionOpen(true)}
            className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva comisión
          </button>
        </AdminControls>
        <button
          type="button"
          onClick={() => setNewEventOpen(true)}
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo evento
        </button>
        <AdminControls yearId={yearId} yearSlug={yearSlug} requireAcademicStructure noWrapper>
          <button
            type="button"
            onClick={() => setEditSubjectOpen(true)}
            className="inline-flex items-center gap-2 rounded border border-white/12 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar materia
          </button>
        </AdminControls>
      </div>

      {/* Modales */}
      <AdminControls yearId={yearId} yearSlug={yearSlug} requireAcademicStructure noWrapper>
        <SubjectModal
          open={editSubjectOpen}
          onClose={() => setEditSubjectOpen(false)}
          subject={{
            id: subject.id,
            nombre: subject.nombre,
            descripcion: subject.descripcion,
            driveUrl: subject.driveUrl,
            playlistUrl: subject.playlistUrl,
            playlistEnabled: subject.playlistEnabled,
          }}
          yearId={yearId}
        />
      </AdminControls>

      <EventModal
        key={`${agendaId}-${subject.slug}-${newEventOpen}`}
        open={newEventOpen}
        onClose={() => setNewEventOpen(false)}
        agendaId={agendaId}
        subjectId={subject.id}
        subjectSlug={subject.slug}
        tiposEvento={tiposEvento}
        commissions={subject.commissions}
        categoriasDisponibles={subject.categoriasDisponibles}
      />

      <AdminControls yearId={yearId} yearSlug={yearSlug} requireAcademicStructure noWrapper>
        <CommissionModal
          open={newCommissionOpen}
          onClose={() => setNewCommissionOpen(false)}
          subject={{
            id: subject.id,
            nombre: subject.nombre,
          }}
          commissions={subject.commissions}
        />
      </AdminControls>

      {/* Modal de creación de apunte */}
      <ApunteModal
        open={newApunteOpen}
        onClose={() => setNewApunteOpen(false)}
        subjectId={subject.id}
        categoriasDisponibles={subject.categoriasDisponibles}
      />

      {/* Modal de edición de apunte — se monta solo cuando hay un apunte seleccionado */}
      {editingApunte && (
        <ApunteModal
          key={editingApunte.id}
          open={true}
          onClose={() => setEditingApunte(null)}
          subjectId={subject.id}
          apunte={editingApunte}
          categoriasDisponibles={subject.categoriasDisponibles}
        />
      )}

      <QuizBankModal
        key={uploadBankKey}
        open={uploadBankOpen}
        onClose={() => setUploadBankOpen(false)}
        subjectSlug={subject.slug}
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
  const [pending, startTransition] = useTransition()

  return (
    <AdminControls yearId={yearId} yearSlug={yearSlug}>
      <button
        type="button"
        title="Eliminar apunte"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const formData = new FormData()
            formData.append('id', apunteId)
            formData.append('subjectSlug', subjectSlug)
            await deleteApunteAction(formData)
            // Avisa al feed para que el apunte desaparezca al instante.
            window.dispatchEvent(new CustomEvent('apuntes-changed'))
          })
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-rose-400/60 transition-colors hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </AdminControls>
  )
}
