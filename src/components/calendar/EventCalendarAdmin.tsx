'use client'

import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EventCalendar, type EventCalendarEvent } from './EventCalendar'
import { EventModal } from '@/components/admin/EventModal'
import { useAdminAccess } from '@/components/admin/adminAccess'
import { Sheet } from '@/components/ui/Sheet'
import { updateEventoFechaAction, deleteEvento } from '@/app/admin/actions'
import { cn, formatEventDateTime } from '@/lib/utils'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { RelatedApunteLinks } from '@/components/events/RelatedApunteLinks'
import type { CommissionOption } from '@/lib/commission-preferences'

// "Fecha · hora" del evento seleccionado. La fecha llega como "YYYY-MM-DD"; si
// viniera un Date (fallback de FullCalendar) tomamos su día en UTC.
function formatSelectedEventDate(event: EventCalendarEvent): string {
  const value = event.fecha ?? event.start
  if (!value) return ''
  const fechaKey =
    typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)
  return formatEventDateTime(fechaKey, event.hora ?? null)
}

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
  subjectId?: string
  subjectSlug?: string
  yearId?: string
  yearSlug?: string
  commissionSlug?: string
  tiposEvento: TipoEvento[]
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
  subjects?: readonly {
    id: string
    slug: string
    nombre: string
    agendaId: string
    commissions: readonly CommissionOption[]
    categoriasDisponibles?: Array<{ id: string; nombre: string }>
  }[]
  commissions?: readonly CommissionOption[]
  selectedEvent?: EventCalendarEvent | null
  setSelectedEvent?: (event: EventCalendarEvent | null) => void
  sheetOpen?: boolean
  setSheetOpen?: (open: boolean) => void
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
  subjectId = '',
  subjectSlug = '',
  yearId,
  yearSlug,
  commissionSlug,
  tiposEvento,
  categoriasDisponibles,
  subjects,
  commissions,
  selectedEvent,
  setSelectedEvent,
  sheetOpen,
  setSheetOpen,
}: EventCalendarAdminProps) {
  const canEdit = useAdminAccess({ yearId, yearSlug }) ?? false
  const router = useRouter()
  const [isDeleting, startTransition] = useTransition()
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [initialDate, setInitialDate] = useState<string | undefined>()

  const [localSelectedEvent, setLocalSelectedEvent] = useState<EventCalendarEvent | null>(null)
  const [localSheetOpen, setLocalSheetOpen] = useState(false)

  const activeSelectedEvent = setSelectedEvent !== undefined ? selectedEvent : localSelectedEvent
  const activeSheetOpen = setSheetOpen !== undefined ? sheetOpen : localSheetOpen

  const setActiveSelectedEvent = setSelectedEvent ?? setLocalSelectedEvent
  const setActiveSheetOpen = setSheetOpen ?? setLocalSheetOpen

  const handleEventDrop = useCallback(
    async (id: string, nuevaFechaKey: string): Promise<boolean> => {
      try {
        const eventObj = events.find((e) => e.id === id)
        const activeSlug = eventObj?.subjectSlug ?? subjectSlug
        if (!activeSlug) return false
        const result = await updateEventoFechaAction(id, nuevaFechaKey, activeSlug)
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
    setActiveSelectedEvent(event)
    setActiveSheetOpen(true)
  }, [setActiveSelectedEvent, setActiveSheetOpen])

  const handleDelete = useCallback(() => {
    if (!activeSelectedEvent?.id) return
    if (window.confirm('¿Estás seguro de que querés eliminar este evento?')) {
      startTransition(async () => {
        try {
          const formData = new FormData()
          formData.append('id', activeSelectedEvent.id!)
          await deleteEvento(formData)
          setActiveSheetOpen(false)
          setActiveSelectedEvent(null)
          router.refresh()
          toast.success('Evento eliminado')
        } catch (err) {
          console.error(err)
          toast.error('No pudimos eliminar el evento. Probá de nuevo.')
        }
      })
    }
  }, [activeSelectedEvent, router, setActiveSheetOpen, setActiveSelectedEvent])

  const subjectHref = activeSelectedEvent?.subjectSlug && yearSlug
    ? buildSubjectHref({
        yearSlug,
        subjectSlug: activeSelectedEvent.subjectSlug,
        commissionSlug: activeSelectedEvent.commissionSlug ?? commissionSlug,
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
        open={!!activeSheetOpen}
        onClose={() => {
          setActiveSheetOpen(false)
          setActiveSelectedEvent(null)
        }}
        title="Detalles del evento"
      >
        {activeSelectedEvent && (
          <div className="space-y-6">
            {/* Header info */}
            <div>
              <span
                className={cn(
                  'inline-flex border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] rounded-none mb-3',
                  activeSelectedEvent.tipo?.toLowerCase() === 'examen' ||
                    activeSelectedEvent.tipo?.toLowerCase() === 'parcial' ||
                    activeSelectedEvent.tipo?.toLowerCase() === 'final' ||
                    activeSelectedEvent.tipo?.toLowerCase() === 'recuperatorio'
                    ? 'border-red-500/20 bg-red-500/10 text-red-400'
                    : activeSelectedEvent.tipo?.toLowerCase() === 'trabajo-practico' ||
                      activeSelectedEvent.tipo?.toLowerCase() === 'tp'
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                    : activeSelectedEvent.tipo?.toLowerCase() === 'entrega'
                    ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'
                    : activeSelectedEvent.tipo?.toLowerCase() === 'exposicion'
                    ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                    : activeSelectedEvent.tipo?.toLowerCase() === 'clase'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-violet-500/20 bg-violet-500/10 text-violet-400',
                )}
              >
                {activeSelectedEvent.tipo}
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white font-display leading-tight">
                {activeSelectedEvent.tituloOriginal ??
                  activeSelectedEvent.title ??
                  activeSelectedEvent.titulo}
              </h3>
            </div>

            {/* Detalles */}
            <div className="space-y-4 border-t border-white/6 pt-5">
              {activeSelectedEvent.materiaNombre && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Materia
                  </span>
                  {subjectHref ? (
                    <Link
                      href={subjectHref}
                      className="text-sm font-bold text-white transition-colors hover:text-red-400 hover:underline cursor-pointer"
                    >
                      {activeSelectedEvent.materiaNombre}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {activeSelectedEvent.materiaNombre}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Fecha y Horario
                </span>
                <span className="text-sm font-medium text-white/80">
                  {formatSelectedEventDate(activeSelectedEvent)}
                </span>
              </div>

              {activeSelectedEvent.commissionNombre ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Comisión
                  </span>
                  <span className="text-sm font-medium text-white/80">
                    {activeSelectedEvent.commissionNombre}
                  </span>
                </div>
              ) : null}

              {activeSelectedEvent.apuntes && activeSelectedEvent.apuntes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Apuntes relacionados
                  </span>
                  <RelatedApunteLinks apuntes={activeSelectedEvent.apuntes} limit={activeSelectedEvent.apuntes.length} />
                </div>
              ) : null}
            </div>

            {/* Descripcion */}
            {activeSelectedEvent.descripcionHtml ? (
              <div className="space-y-2 border-t border-white/6 pt-5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 block mb-2">
                  Descripción
                </span>
                <div
                  className="text-sm leading-7 text-white/70 [&_a]:text-red-400 [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                  dangerouslySetInnerHTML={{
                    __html: activeSelectedEvent.descripcionHtml,
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
          subjectId={subjectId}
          subjectSlug={subjectSlug}
          tiposEvento={tiposEvento}
          initialDate={initialDate}
          subjects={subjects}
          commissions={commissions}
          categoriasDisponibles={categoriasDisponibles}
        />
      )}

      {canEdit && activeSelectedEvent && (
        <EventModal
          key={`edit-${activeSelectedEvent.id}`}
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setActiveSheetOpen(false)
            setActiveSelectedEvent(null)
          }}
          agendaId={agendaId}
          subjectId={activeSelectedEvent.subjectId ?? subjectId}
          subjectSlug={subjectSlug}
          tiposEvento={tiposEvento}
          subjects={subjects}
          commissions={commissions}
          eventToEdit={activeSelectedEvent}
          categoriasDisponibles={categoriasDisponibles}
        />
      )}
    </>
  )
}
