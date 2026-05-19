'use client'

import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import { DarkCard } from '@/components/ui/DarkCard'
import { cn, slugify } from '@/lib/utils'

type EventCalendarDateInput = string | Date

export interface EventCalendarEvent {
  id?: string
  title?: string
  titulo?: string
  date?: EventCalendarDateInput
  fecha?: EventCalendarDateInput
  start?: EventCalendarDateInput
  end?: EventCalendarDateInput
  allDay?: boolean
  type?: string | null
  tipo?: string | null
  classNames?: string | string[]
}

interface EventCalendarProps {
  events?: readonly EventCalendarEvent[]
  emptyMessage?: string
  className?: string
  /** Habilita drag-and-drop y dateClick para el admin. Anónimos siempre read-only. */
  editable?: boolean
  /** Callback cuando se arrastra un evento a otra fecha. Si retorna false o lanza, el drag se revierte. */
  onEventDrop?: (id: string, nuevaFecha: Date) => Promise<boolean>
  /** Callback cuando el admin hace clic en un día vacío. */
  onDateClick?: (fecha: string) => void
}

const EVENT_TYPE_CLASS_MAP = {
  examen: 'fc-event-tone-red',
  parcial: 'fc-event-tone-red',
  final: 'fc-event-tone-red',
  recuperatorio: 'fc-event-tone-red',
  'trabajo-practico': 'fc-event-tone-yellow',
  tp: 'fc-event-tone-yellow',
  entrega: 'fc-event-tone-cyan',
  exposicion: 'fc-event-tone-orange',
  clase: 'fc-event-tone-emerald',
} as const

const EVENT_TYPE_FALLBACK_CLASSES = [
  'fc-event-tone-amber',
  'fc-event-tone-emerald',
  'fc-event-tone-violet',
  'fc-event-tone-rose',
  'fc-event-tone-cyan',
] as const

function hashString(value: string): number {
  let hash = 0

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }

  return Math.abs(hash)
}

function toClassNames(classNames?: string | string[]): string[] {
  if (Array.isArray(classNames)) {
    return classNames.filter(Boolean)
  }

  if (typeof classNames === 'string') {
    return classNames.split(/\s+/).filter(Boolean)
  }

  return []
}

function resolveEventClassNames(event: EventCalendarEvent): string[] {
  const customClassNames = toClassNames(event.classNames)
  if (customClassNames.length > 0) return customClassNames

  const normalizedType = slugify(event.type ?? event.tipo ?? '')
  if (!normalizedType) return ['fc-event-tone-slate']

  return [
    EVENT_TYPE_CLASS_MAP[
      normalizedType as keyof typeof EVENT_TYPE_CLASS_MAP
    ] ??
      EVENT_TYPE_FALLBACK_CLASSES[
        hashString(normalizedType) % EVENT_TYPE_FALLBACK_CLASSES.length
      ],
  ]
}

function buildEventId(
  event: EventCalendarEvent,
  index: number,
  title: string,
  dateValue: EventCalendarDateInput,
): string {
  if (event.id) return event.id

  const serializedDate =
    typeof dateValue === 'string' ? dateValue : dateValue.toISOString()

  return `event-${index}-${slugify(title) || 'sin-titulo'}-${serializedDate}`
}

export function EventCalendar({
  events = [],
  emptyMessage = 'Sin eventos cargados por ahora.',
  className,
  editable = false,
  onEventDrop,
  onDateClick,
}: EventCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null)

  async function handleEventDrop(info: { event: { id: string; start: Date | null }; revert: () => void }) {
    if (!onEventDrop) {
      info.revert()
      return
    }
    const ok = await onEventDrop(info.event.id, info.event.start ?? new Date())
    if (!ok) info.revert()
  }

  function handleDateClick(info: DateClickArg) {
    onDateClick?.(info.dateStr)
  }

  const calendarEvents = events.flatMap((event, index) => {
    const title = (event.title ?? event.titulo ?? '').trim()
    const startValue = event.start ?? event.date ?? event.fecha
    const usesExplicitStart = event.start !== undefined

    if (!title || !startValue) {
      return []
    }

    return [
      {
        id: buildEventId(event, index, title, startValue),
        title,
        classNames: resolveEventClassNames(event),
        start: startValue,
        end: event.end,
        allDay: usesExplicitStart ? event.allDay : event.allDay ?? true,
      },
    ]
  })

  return (
    <DarkCard className={cn('overflow-hidden p-4 sm:p-6', className, editable && 'calendar-editable')}>
      {calendarEvents.length === 0 ? (
        <p className="mb-4 text-sm text-white/54">{emptyMessage}</p>
      ) : null}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'customPrev,customNext customToday',
          center: 'title',
          right: '',
        }}
        customButtons={{
          customPrev: {
            text: '←',
            click: () => calendarRef.current?.getApi().prev(),
            hint: 'Mes anterior',
          },
          customNext: {
            text: '→',
            click: () => calendarRef.current?.getApi().next(),
            hint: 'Mes siguiente',
          },
          customToday: {
            text: 'Hoy',
            click: () => calendarRef.current?.getApi().today(),
          },
        }}
        events={calendarEvents}
        locale="es"
        firstDay={1}
        height="auto"
        fixedWeekCount={false}
        showNonCurrentDates={false}
        displayEventTime={false}
        dayMaxEventRows={3}
        editable={editable}
        eventStartEditable={editable}
        eventDrop={editable ? handleEventDrop : undefined}
        dateClick={editable ? handleDateClick : undefined}
      />
    </DarkCard>
  )
}
