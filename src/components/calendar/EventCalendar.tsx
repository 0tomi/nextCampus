'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
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
}

const EVENT_TYPE_CLASS_MAP = {
  examen: 'fc-event-tone-rose',
  parcial: 'fc-event-tone-rose',
  final: 'fc-event-tone-rose',
  recuperatorio: 'fc-event-tone-rose',
  'trabajo-practico': 'fc-event-tone-amber',
  tp: 'fc-event-tone-amber',
  entrega: 'fc-event-tone-cyan',
  exposicion: 'fc-event-tone-violet',
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
}: EventCalendarProps) {
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
    <DarkCard className={cn('overflow-hidden p-4 sm:p-6', className)}>
      {calendarEvents.length === 0 ? (
        <p className="mb-4 text-sm text-white/54">{emptyMessage}</p>
      ) : null}

      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
        buttonText={{ today: 'Hoy' }}
        events={calendarEvents}
        locale="es"
        firstDay={1}
        height="auto"
        fixedWeekCount={false}
        showNonCurrentDates={false}
        displayEventTime={false}
        dayMaxEventRows={3}
      />
    </DarkCard>
  )
}
