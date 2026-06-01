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
import { AlertDialog } from '@/components/ui/AlertDialog'
import { updateEventoFechaAction, deleteEvento } from '@/app/admin/actions'
import { cn, formatEventDateTime } from '@/lib/utils'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { RelatedApunteLinks } from '@/components/events/RelatedApunteLinks'
import { SafeHtml } from '@/components/ui/SafeHtml'
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [initialDate, setInitialDate] = useState<string | undefined>()

  const [localSelectedEvent, setLocalSelectedEvent] = useState<EventCalendarEvent | null>(null)
  const [localSheetOpen, setLocalSheetOpen] = useState(false)

  const activeSelectedEvent = setSelectedEvent !== undefined ? selectedEvent : localSelectedEvent
  const activeSheetOpen = setSheetOpen !== undefined ? sheetOpen : localSheetOpen

  const setActiveSelectedEvent = setSelectedEvent ?? setLocalSelectedEvent
  const setActiveSheetOpen = setSheetOpen ?? setLocalSheetOpen

  // Editar/eliminar un evento concreto exige propiedad: los managers pueden con
  // cualquiera; el ayudante solo con los que creó.
  const canEditSelectedEvent =
    useAdminAccess({
      yearId,
      yearSlug,
      ownerUserId: activeSelectedEvent?.createdByUserId,
    }) ?? false

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

  const handleConfirmDelete = useCallback(() => {
    if (!activeSelectedEvent?.id) return
    setConfirmDeleteOpen(false)
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

      <EventDetailSheet
        event={activeSelectedEvent ?? null}
        open={!!activeSheetOpen}
        subjectHref={subjectHref}
        canEdit={canEditSelectedEvent}
        isDeleting={isDeleting}
        onClose={() => {
          setActiveSheetOpen(false)
          setActiveSelectedEvent(null)
        }}
        onEdit={() => setIsEditModalOpen(true)}
        onDelete={() => setConfirmDeleteOpen(true)}
      />

      <AlertDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar evento"
        description="Esta acción no se puede deshacer. El evento se va a quitar del calendario para siempre."
        confirmText="Eliminar"
        variant="destructive"
      />

      <CreateEventModal
        canEdit={canEdit}
        open={eventModalOpen}
        agendaId={agendaId}
        categoriasDisponibles={categoriasDisponibles}
        commissions={commissions}
        initialDate={initialDate}
        subjectId={subjectId}
        subjectSlug={subjectSlug}
        subjects={subjects}
        tiposEvento={tiposEvento}
        onClose={() => {
          setEventModalOpen(false)
          setInitialDate(undefined)
        }}
      />

      <EditEventModal
        canEdit={canEditSelectedEvent}
        event={activeSelectedEvent ?? null}
        open={isEditModalOpen}
        agendaId={agendaId}
        categoriasDisponibles={categoriasDisponibles}
        commissions={commissions}
        fallbackSubjectId={subjectId}
        subjectSlug={subjectSlug}
        subjects={subjects}
        tiposEvento={tiposEvento}
        onClose={() => {
          setIsEditModalOpen(false)
          setActiveSheetOpen(false)
          setActiveSelectedEvent(null)
        }}
      />
    </>
  )
}


function getEventToneClass(tipo?: string | null) {
  const normalized = tipo?.toLowerCase()
  if (
    normalized === 'examen' ||
    normalized === 'parcial' ||
    normalized === 'final' ||
    normalized === 'recuperatorio'
  ) {
    return 'border-red-500/20 bg-red-500/10 text-red-400'
  }
  if (normalized === 'trabajo-practico' || normalized === 'tp') {
    return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
  }
  if (normalized === 'entrega') return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'
  if (normalized === 'exposicion') return 'border-orange-500/20 bg-orange-500/10 text-orange-400'
  if (normalized === 'clase') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
  return 'border-violet-500/20 bg-violet-500/10 text-violet-400'
}

function EventDetailSheet({
  canEdit,
  event,
  isDeleting,
  open,
  subjectHref,
  onClose,
  onDelete,
  onEdit,
}: {
  canEdit: boolean
  event: EventCalendarEvent | null
  isDeleting: boolean
  open: boolean
  subjectHref: string | null
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Detalles del evento">
      {event ? (
        <EventDetailContent
          canEdit={canEdit}
          event={event}
          isDeleting={isDeleting}
          subjectHref={subjectHref}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ) : null}
    </Sheet>
  )
}

function EventDetailContent({
  canEdit,
  event,
  isDeleting,
  subjectHref,
  onDelete,
  onEdit,
}: {
  canEdit: boolean
  event: EventCalendarEvent
  isDeleting: boolean
  subjectHref: string | null
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <div className="space-y-6">
      <EventDetailHeader event={event} />
      <EventDetailsList event={event} subjectHref={subjectHref} />
      <EventDescription event={event} />
      {canEdit ? <EventAdminActions isDeleting={isDeleting} onDelete={onDelete} onEdit={onEdit} /> : null}
    </div>
  )
}

function EventDetailHeader({ event }: { event: EventCalendarEvent }) {
  return (
    <div>
      <span
        className={cn(
          'mb-3 inline-flex rounded-none border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
          getEventToneClass(event.tipo),
        )}
      >
        {event.tipo}
      </span>
      <h3 className="font-display text-2xl font-black leading-tight tracking-tight text-white">
        {event.tituloOriginal ?? event.title ?? event.titulo}
      </h3>
    </div>
  )
}

function EventDetailsList({ event, subjectHref }: { event: EventCalendarEvent; subjectHref: string | null }) {
  return (
    <div className="space-y-4 border-t border-white/6 pt-5">
      {event.materiaNombre ? <EventSubjectDetail event={event} subjectHref={subjectHref} /> : null}
      <EventMetaDetail label="Fecha y Horario" value={formatSelectedEventDate(event)} />
      {event.commissionNombre ? <EventMetaDetail label="Comisión" value={event.commissionNombre} /> : null}
      {event.apuntes && event.apuntes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Apuntes relacionados
          </span>
          <RelatedApunteLinks apuntes={event.apuntes} limit={event.apuntes.length} />
        </div>
      ) : null}
    </div>
  )
}

function EventSubjectDetail({ event, subjectHref }: { event: EventCalendarEvent; subjectHref: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Materia</span>
      {subjectHref ? (
        <Link href={subjectHref} className="cursor-pointer text-sm font-bold text-white transition-colors hover:text-red-400 hover:underline">
          {event.materiaNombre}
        </Link>
      ) : (
        <span className="text-sm font-bold text-white">{event.materiaNombre}</span>
      )}
    </div>
  )
}

function EventMetaDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</span>
      <span className="text-sm font-medium text-white/80">{value}</span>
    </div>
  )
}

function EventDescription({ event }: { event: EventCalendarEvent }) {
  if (!event.descripcionHtml) {
    return (
      <div className="border-t border-white/6 pt-5">
        <p className="text-sm text-white/30 italic">Sin descripción detallada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 border-t border-white/6 pt-5">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/30">
        Descripción
      </span>
      <SafeHtml
        className="text-sm leading-7 text-white/70 [&_a]:text-red-400 [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
        html={event.descripcionHtml}
      />
    </div>
  )
}

function EventAdminActions({
  isDeleting,
  onDelete,
  onEdit,
}: {
  isDeleting: boolean
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-t border-white/6 pt-5">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-2 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white"
      >
        <Pencil className="size-3.5" />
        Editar evento
      </button>
      <button
        type="button"
        disabled={isDeleting}
        onClick={onDelete}
        className="inline-flex cursor-pointer items-center gap-2 rounded border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 shadow-lg transition-colors hover:bg-rose-500/20 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
        {isDeleting ? 'Eliminando...' : 'Eliminar evento'}
      </button>
    </div>
  )
}

type EventModalSharedProps = Pick<
  EventCalendarAdminProps,
  'agendaId' | 'categoriasDisponibles' | 'commissions' | 'subjectSlug' | 'subjects' | 'tiposEvento'
>

function CreateEventModal({
  canEdit,
  initialDate,
  open,
  subjectId,
  onClose,
  ...modalProps
}: EventModalSharedProps & {
  canEdit: boolean
  initialDate?: string
  open: boolean
  subjectId: string
  onClose: () => void
}) {
  if (!canEdit) return null

  return (
    <EventModal
      key={initialDate || 'default'}
      open={open}
      onClose={onClose}
      subjectId={subjectId}
      initialDate={initialDate}
      {...modalProps}
    />
  )
}

function EditEventModal({
  canEdit,
  event,
  fallbackSubjectId,
  open,
  onClose,
  ...modalProps
}: EventModalSharedProps & {
  canEdit: boolean
  event: EventCalendarEvent | null
  fallbackSubjectId: string
  open: boolean
  onClose: () => void
}) {
  if (!canEdit || !event) return null

  return (
    <EventModal
      key={`edit-${event.id}`}
      open={open}
      onClose={onClose}
      subjectId={event.subjectId ?? fallbackSubjectId}
      eventToEdit={event}
      {...modalProps}
    />
  )
}
