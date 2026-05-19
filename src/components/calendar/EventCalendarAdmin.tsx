'use client'

import { useEffect, useState, useCallback } from 'react'
import { EventCalendar, type EventCalendarEvent } from './EventCalendar'
import { EventModal } from '@/components/admin/EventModal'
import { updateEventoFechaAction } from '@/app/admin/actions'

interface TipoEvento {
  id: string
  nombre: string
}

interface EventCalendarAdminProps {
  events: readonly EventCalendarEvent[]
  emptyMessage?: string
  className?: string
  agendaId?: string
  subjectSlug?: string
  tiposEvento: TipoEvento[]
  subjects?: {
    id: string
    slug: string
    nombre: string
    agendaId: string
  }[]
}

/**
 * Wrapper client que detecta si la sesión activa es de admin y, si lo es,
 * habilita el modo editable del calendario (drag-and-drop y clic en días).
 * Anónimos reciben el calendario en modo solo lectura, idéntico al actual.
 * ISR no se rompe porque esta detección ocurre en el cliente.
 */
export function EventCalendarAdmin({
  events,
  emptyMessage,
  className,
  agendaId = '',
  subjectSlug = '',
  tiposEvento,
  subjects,
}: EventCalendarAdminProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [initialDate, setInitialDate] = useState<string | undefined>()

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/me', { credentials: 'same-origin' })
      .then((res) => (res.ok ? (res.json() as Promise<{ isAdmin: boolean }>) : { isAdmin: false }))
      .then((data) => {
        if (!cancelled) setIsAdmin(data.isAdmin)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleEventDrop = useCallback(
    async (id: string, nuevaFecha: Date): Promise<boolean> => {
      try {
        const eventObj = events.find((e) => e.id === id)
        const activeSlug = eventObj?.subjectSlug ?? subjectSlug
        if (!activeSlug) return false
        const result = await updateEventoFechaAction(id, nuevaFecha, activeSlug)
        return result.ok
      } catch {
        return false
      }
    },
    [events, subjectSlug],
  )

  const handleDateClick = useCallback((fecha: string) => {
    // Convertir YYYY-MM-DD a YYYY-MM-DDTHH:mm para datetime-local
    const normalized = fecha.length === 10 ? `${fecha}T09:00` : fecha
    setInitialDate(normalized)
    setEventModalOpen(true)
  }, [])

  return (
    <>
      <EventCalendar
        events={events}
        emptyMessage={emptyMessage}
        className={className}
        editable={isAdmin}
        onEventDrop={isAdmin ? handleEventDrop : undefined}
        onDateClick={isAdmin ? handleDateClick : undefined}
      />

      {isAdmin && (
        <EventModal
          key={initialDate || 'default'}
          open={eventModalOpen}
          onClose={() => {
            setEventModalOpen(false)
            setInitialDate(undefined)
          }}
          agendaId={agendaId}
          subjectSlug={subjectSlug}
          tiposEvento={tiposEvento}
          initialDate={initialDate}
          subjects={subjects}
        />
      )}
    </>
  )
}
