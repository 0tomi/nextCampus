'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { AdminControls } from './AdminControls'
import { EventModal } from './EventModal'

interface TipoEvento {
  id: string
  nombre: string
}

interface Subject {
  id: string
  slug: string
  nombre: string
  agendaId: string
}

interface YearPageAdminOverlayProps {
  yearId?: string
  subjects: Subject[]
  tiposEvento: TipoEvento[]
}

export function YearPageAdminOverlay({
  yearId,
  subjects,
  tiposEvento,
}: YearPageAdminOverlayProps) {
  const [newEventOpen, setNewEventOpen] = useState(false)

  useEffect(() => {
    const handleNewEvent = () => setNewEventOpen(true)
    window.addEventListener('open-admin-modal-new-event', handleNewEvent)
    return () => {
      window.removeEventListener('open-admin-modal-new-event', handleNewEvent)
    }
  }, [])

  return (
    <AdminControls yearId={yearId}>
      {/* Floating button for year level actions */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setNewEventOpen(true)}
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2.5 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nuevo evento de año
        </button>
      </div>

      <EventModal
        key={`${newEventOpen}`}
        open={newEventOpen}
        onClose={() => setNewEventOpen(false)}
        tiposEvento={tiposEvento}
        subjects={subjects}
      />
    </AdminControls>
  )
}
