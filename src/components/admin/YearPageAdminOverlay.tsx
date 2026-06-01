'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { AdminControls } from './AdminControls'
import { EventModal } from './EventModal'
import { YearModal } from './YearModal'
import { ConfirmDeleteYearModal } from './ConfirmDeleteModal'
import type { CommissionOption } from '@/lib/commission-preferences'

interface TipoEvento {
  id: string
  nombre: string
}

interface Subject {
  id: string
  slug: string
  nombre: string
  agendaId: string
  commissions: readonly CommissionOption[]
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
}

interface YearData {
  id: string
  slug: string
  nombre: string
  descripcion?: string | null
  driveUrl?: string | null
  playlistUrl?: string | null
  playlistEnabled?: boolean
  orden: number
}

interface YearPageAdminOverlayProps {
  yearId?: string
  subjects: Subject[]
  tiposEvento: TipoEvento[]
  year?: YearData
}

export function YearPageAdminOverlay({
  yearId,
  subjects,
  tiposEvento,
  year,
}: YearPageAdminOverlayProps) {
  const [newEventOpen, setNewEventOpen] = useState(false)
  const [editYearOpen, setEditYearOpen] = useState(false)
  const [deleteYearOpen, setDeleteYearOpen] = useState(false)

  useEffect(() => {
    const handleNewEvent = () => setNewEventOpen(true)
    const handleEditYear = () => setEditYearOpen(true)
    const handleDeleteYear = () => setDeleteYearOpen(true)

    window.addEventListener('open-admin-modal-new-event', handleNewEvent)
    window.addEventListener('open-admin-modal-edit-year', handleEditYear)
    window.addEventListener('open-admin-modal-delete-year', handleDeleteYear)

    return () => {
      window.removeEventListener('open-admin-modal-new-event', handleNewEvent)
      window.removeEventListener('open-admin-modal-edit-year', handleEditYear)
      window.removeEventListener('open-admin-modal-delete-year', handleDeleteYear)
    }
  }, [])

  return (
    <>
      <AdminControls yearId={yearId}>
        {/* Floating button for year level actions - Desktop only */}
        <div className="fixed bottom-6 right-6 z-40 hidden lg:block">
          <button
            type="button"
            onClick={() => setNewEventOpen(true)}
            className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2.5 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <Plus className="size-4" />
            Nuevo evento de año
          </button>
        </div>
      </AdminControls>

      <AdminControls yearId={yearId} noWrapper>
        <EventModal
          key={`${newEventOpen}`}
          open={newEventOpen}
          onClose={() => setNewEventOpen(false)}
          tiposEvento={tiposEvento}
          subjects={subjects}
        />

        {year && (
          <>
            <YearModal
              open={editYearOpen}
              onClose={() => setEditYearOpen(false)}
              year={{
                id: year.id,
                nombre: year.nombre,
                descripcion: year.descripcion,
                driveUrl: year.driveUrl,
                playlistUrl: year.playlistUrl,
                playlistEnabled: year.playlistEnabled,
                orden: year.orden,
              }}
            />
            <ConfirmDeleteYearModal
              open={deleteYearOpen}
              onClose={() => setDeleteYearOpen(false)}
              year={{ id: year.id, nombre: year.nombre }}
            />
          </>
        )}
      </AdminControls>
    </>
  )
}
