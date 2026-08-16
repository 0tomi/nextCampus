'use client'

import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import { DarkCard } from '@/components/ui/DarkCard'
import { cn, slugify } from '@/lib/utils'
import type { RelatedApunteLink } from '@/components/events/RelatedApunteLinks'
import { PERIODO_TONE_BG, type PeriodoCalendario, type PeriodoTone } from '@/lib/periodos'

type EventCalendarDateInput = string | Date

export interface EventCalendarEvent {
  id?: string
  title?: string
  titulo?: string
  date?: EventCalendarDateInput
  fecha?: EventCalendarDateInput
  /** Hora opcional "HH:mm" | null. null = evento sin hora definida. */
  hora?: string | null
  start?: EventCalendarDateInput
  end?: EventCalendarDateInput
  allDay?: boolean
  type?: string | null
  tipo?: string | null
  tipoId?: string
  classNames?: string | string[]
  yearSlug?: string
  subjectSlug?: string
  subjectId?: string
  materiaNombre?: string
  descripcionHtml?: string | null
  tituloOriginal?: string
  commissionId?: string | null
  commissionSlug?: string | null
  commissionNombre?: string | null
  apuntes?: RelatedApunteLink[]
  /** Autor del evento, para gatear edición/eliminación por propiedad. */
  createdByUserId?: string | null
}

interface EventCalendarProps {
  events?: readonly EventCalendarEvent[]
  /** Períodos académicos (mesas, suspensiones): pintan el fondo de los días. */
  periodos?: readonly PeriodoCalendario[]
  emptyMessage?: string
  className?: string
  dayMaxEvents?: number
  /** Habilita drag-and-drop y dateClick para el admin. Anónimos siempre read-only. */
  editable?: boolean
  /** Callback cuando se arrastra un evento a otra fecha. Recibe el día destino como "YYYY-MM-DD". Si retorna false o lanza, el drag se revierte. */
  onEventDrop?: (id: string, nuevaFechaKey: string) => Promise<boolean>
  /** Callback cuando el admin hace clic en un día vacío. */
  onDateClick?: (fecha: string) => void
  /** Callback cuando se hace clic en un evento. */
  onEventClick?: (event: EventCalendarEvent) => void
  /** Callback cuando se hace clic en un día pintado por un período. */
  onPeriodoClick?: (periodo: PeriodoCalendario) => void
}

const EMPTY_PERIODOS: readonly PeriodoCalendario[] = []

const PERIODO_EVENT_ID_PREFIX = 'periodo-'

// "YYYY-MM-DD" + 1 día. FullCalendar trata `end` como exclusivo, así que para
// pintar hasta fechaFin inclusive hay que pasar el día siguiente.
function nextDayKey(key: string): string {
  const date = new Date(`${key}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

const EMPTY_EVENTS: readonly EventCalendarEvent[] = []

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

function buildDayKey(dateValue: EventCalendarDateInput): string {
  if (typeof dateValue === 'string') {
    return dateValue.slice(0, 10)
  }

  return dateValue.toISOString().slice(0, 10)
}

function renderEventContent(info: { event: { title: string } }) {
  return (
    <div className="fc-event-chip">
      <span className="fc-event-chip__viewport">
        <span className="fc-event-chip__track">
          <span className="fc-event-chip__title">{info.event.title}</span>
          <span
            aria-hidden="true"
            className="fc-event-chip__title fc-event-chip__title--duplicate"
          >
            {info.event.title}
          </span>
        </span>
      </span>
    </div>
  )
}

export function EventCalendar({
  events = EMPTY_EVENTS,
  periodos = EMPTY_PERIODOS,
  emptyMessage = 'Sin eventos cargados por ahora.',
  className,
  dayMaxEvents = 3,
  editable = false,
  onEventDrop,
  onDateClick,
  onEventClick,
  onPeriodoClick,
}: EventCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null)

  function handleEventDrop(info: { event: { id: string; startStr: string }; revert: () => void }) {
    if (!onEventDrop) {
      info.revert()
      return
    }
    // `startStr` de un evento all-day es "YYYY-MM-DD" (sin zona horaria). Lo usamos
    // como día destino para no reintroducir el off-by-one que evitamos en todo el resto.
    const nuevaFechaKey = info.event.startStr.slice(0, 10)
    void (async () => {
      const ok = await onEventDrop(info.event.id, nuevaFechaKey)
      if (!ok) info.revert()
    })()
  }

  function handleDateClick(info: DateClickArg) {
    onDateClick?.(info.dateStr)
  }

  const eventCountByDay = events.reduce<Record<string, number>>((acc, event) => {
    const startValue = event.start ?? event.date ?? event.fecha
    const title = (event.title ?? event.titulo ?? '').trim()

    if (!startValue || !title) {
      return acc
    }

    const dayKey = buildDayKey(startValue)
    acc[dayKey] = (acc[dayKey] ?? 0) + 1
    return acc
  }, {})

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
        classNames: [
          ...resolveEventClassNames(event),
          (eventCountByDay[buildDayKey(startValue)] ?? 0) === 1
            ? 'fc-event-single'
            : 'fc-event-multi',
        ],
        start: startValue,
        end: event.end,
        allDay: usesExplicitStart ? event.allDay : event.allDay ?? true,
      },
    ]
  })

  // Períodos como "background events" de FullCalendar: pintan el fondo del día
  // y no compiten con las pastillas (quedan por debajo, no cuentan para "+más").
  const periodoEvents = periodos.map((periodo) => ({
    id: `${PERIODO_EVENT_ID_PREFIX}${periodo.id}`,
    title: periodo.titulo,
    start: periodo.fechaInicio,
    end: nextDayKey(periodo.fechaFin),
    allDay: true,
    display: 'background' as const,
    // El color va inline (FullCalendar lo aplica como style en el bg event;
    // una clase CSS no podría pisarlo). La clase solo ajusta opacidad/cursor.
    backgroundColor: PERIODO_TONE_BG[periodo.categoria.tone as PeriodoTone] || PERIODO_TONE_BG.sky,
    classNames: ['fc-bg-periodo'],
  }))

  const allCalendarEvents = [...periodoEvents, ...calendarEvents]

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
        events={allCalendarEvents}
        locale="es"
        firstDay={1}
        height="auto"
        fixedWeekCount={false}
        showNonCurrentDates={false}
        displayEventTime={false}
        dayMaxEvents={dayMaxEvents}
        moreLinkContent={(args) => `+${args.num} más`}
        editable={editable}
        eventStartEditable={editable}
        eventDrop={editable ? handleEventDrop : undefined}
        eventDidMount={(info) => {
          info.el.setAttribute('title', info.event.title)
        }}
        eventContent={renderEventContent}
        dateClick={editable ? handleDateClick : undefined}
        eventClick={(info) => {
          const clickedId = info.event.id
          if (clickedId.startsWith(PERIODO_EVENT_ID_PREFIX)) {
            const periodoId = clickedId.slice(PERIODO_EVENT_ID_PREFIX.length)
            const periodo = periodos.find((p) => p.id === periodoId)
            if (periodo && onPeriodoClick) onPeriodoClick(periodo)
            return
          }
          const originalEvent = events.find((e, idx) => {
            const startVal = e.start ?? e.date ?? e.fecha
            const titleVal = e.title ?? e.titulo ?? ''
            if (!startVal || !titleVal.trim()) return false

            const eventId = buildEventId(e, idx, titleVal, startVal)
            return eventId === clickedId || e.id === clickedId
          })
          if (originalEvent && onEventClick) {
            onEventClick(originalEvent)
          }
        }}
      />
    </DarkCard>
  )
}
