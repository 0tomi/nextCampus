'use client'

import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { EventCalendar, type EventCalendarEvent } from './EventCalendar'
import { EventModal } from '@/components/admin/EventModal'
import { useAdminAccess } from '@/components/admin/adminAccess'
import { Sheet } from '@/components/ui/Sheet'
import { updateEventoFechaAction, deleteEvento } from '@/app/admin/actions'
import { cn, formatDateTime } from '@/lib/utils'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import type { CommissionOption } from '@/lib/commission-preferences'

interface TipoEvento {
  id: string
  nombre: string
}

interface EventCalendarAdminProps {
  events: readonly EventCalendarEvent[]
  emptyMessage?: string
  className?: string
  dayMaxEvents?: number
  agendaId?: string
  subjectSlug?: string
  yearId?: string
  yearSlug?: string
  commissionSlug?: string
  tiposEvento: TipoEvento[]
  subjects?: readonly {
    id: string
    slug: string
    nombre: string
    agendaId: string
    commissions: readonly CommissionOption[]
  }[]
  commissions?: readonly CommissionOption[]
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
  dayMaxEvents,
  agendaId = '',
  subjectSlug = '',
  yearId,
  yearSlug,
  commissionSlug,
  tiposEvento,
  subjects,
  commissions,
}: EventCalendarAdminProps) {
  const canEdit = useAdminAccess({ yearId, yearSlug }) ?? false
  const router = useRouter()
  const [isDeleting, startTransition] = useTransition()
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [initialDate, setInitialDate] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<EventCalendarEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

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
    // Convertir YYYY-MM-DD to YYYY-MM-DDTHH:mm for datetime-local
    const normalized = fecha.length === 10 ? `${fecha}T09:00` : fecha
    setInitialDate(normalized)
    setEventModalOpen(true)
  }, [])

  const handleEventClick = useCallback((event: EventCalendarEvent) => {
    setSelectedEvent(event)
    setSheetOpen(true)
  }, [])

  const handleDelete = useCallback(() => {
    if (!selectedEvent?.id) return
    if (window.confirm('¿Estás seguro de que querés eliminar este evento?')) {
      startTransition(async () => {
        try {
          const formData = new FormData()
          formData.append('id', selectedEvent.id!)
          await deleteEvento(formData)
          setSheetOpen(false)
          setSelectedEvent(null)
          router.refresh()
        } catch (err) {
          console.error(err)
        }
      })
    }
  }, [selectedEvent, router])

  const subjectHref = selectedEvent?.subjectSlug && yearSlug
    ? buildSubjectHref({
        yearSlug,
        subjectSlug: selectedEvent.subjectSlug,
        commissionSlug: selectedEvent.commissionSlug ?? commissionSlug,
      })
    : null

  return (
    <>
      <EventCalendar
        events={events}
        emptyMessage={emptyMessage}
        className={className}
        dayMaxEvents={dayMaxEvents}
        editable={canEdit}
        onEventDrop={canEdit ? handleEventDrop : undefined}
        onDateClick={canEdit ? handleDateClick : undefined}
        onEventClick={handleEventClick}
      />

      <Sheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setSelectedEvent(null)
        }}
        title="Detalles del evento"
      >
        {selectedEvent && (
          <div className="space-y-6">
            {/* Header info */}
            <div>
              <span
                className={cn(
                  'inline-flex border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] rounded-none mb-3',
                  selectedEvent.tipo?.toLowerCase() === 'examen' ||
                    selectedEvent.tipo?.toLowerCase() === 'parcial' ||
                    selectedEvent.tipo?.toLowerCase() === 'final' ||
                    selectedEvent.tipo?.toLowerCase() === 'recuperatorio'
                    ? 'border-red-500/20 bg-red-500/10 text-red-400'
                    : selectedEvent.tipo?.toLowerCase() === 'trabajo-practico' ||
                      selectedEvent.tipo?.toLowerCase() === 'tp'
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                    : selectedEvent.tipo?.toLowerCase() === 'entrega'
                    ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'
                    : selectedEvent.tipo?.toLowerCase() === 'exposicion'
                    ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                    : selectedEvent.tipo?.toLowerCase() === 'clase'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-violet-500/20 bg-violet-500/10 text-violet-400',
                )}
              >
                {selectedEvent.tipo}
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white font-display leading-tight">
                {selectedEvent.tituloOriginal ??
                  selectedEvent.title ??
                  selectedEvent.titulo}
              </h3>
            </div>

            {/* Detalles */}
            <div className="space-y-4 border-t border-white/6 pt-5">
              {selectedEvent.materiaNombre && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Materia
                  </span>
                  {subjectHref ? (
                    <Link
                      href={subjectHref}
                      className="text-sm font-bold text-white transition-colors hover:text-red-400 hover:underline cursor-pointer"
                    >
                      {selectedEvent.materiaNombre}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {selectedEvent.materiaNombre}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Fecha y Horario
                </span>
                <span className="text-sm font-medium text-white/80">
                  {selectedEvent.fecha
                    ? formatDateTime(selectedEvent.fecha)
                    : selectedEvent.start
                    ? formatDateTime(selectedEvent.start)
                    : ''}
                </span>
              </div>

              {selectedEvent.commissionNombre ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Comisión
                  </span>
                  <span className="text-sm font-medium text-white/80">
                    {selectedEvent.commissionNombre}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Descripcion */}
            {selectedEvent.descripcionHtml ? (
              <div className="space-y-2 border-t border-white/6 pt-5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 block mb-2">
                  Descripción
                </span>
                <div
                  className="text-sm leading-7 text-white/70 [&_a]:text-red-400 [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                  dangerouslySetInnerHTML={{
                    __html: selectedEvent.descripcionHtml,
                  }}
                />
              </div>
            ) : (
              <div className="border-t border-white/6 pt-5">
                <p className="text-sm text-white/30 italic">
                  Sin descripción detallada.
                </p>
              </div>
            )}

            {/* Admin Actions */}
            {canEdit && (
              <div className="flex items-center gap-2 border-t border-white/6 pt-5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar evento
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 shadow-lg transition-colors hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeleting ? 'Eliminando...' : 'Eliminar evento'}
                </button>
              </div>
            )}
          </div>
        )}
      </Sheet>

      {canEdit && (
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
          commissions={commissions}
        />
      )}

      {canEdit && selectedEvent && (
        <EventModal
          key={`edit-${selectedEvent.id}`}
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSheetOpen(false)
            setSelectedEvent(null)
          }}
          agendaId={agendaId}
          subjectSlug={subjectSlug}
          tiposEvento={tiposEvento}
          subjects={subjects}
          commissions={commissions}
          eventToEdit={selectedEvent}
        />
      )}
    </>
  )
}
