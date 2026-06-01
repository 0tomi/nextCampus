'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getEventTone } from '@/components/mobile/shared/tokens'
import { AgendaCard } from '@/components/mobile/agenda/AgendaCard'
import { AdminControls } from '@/components/admin/AdminControls'
import { MobileEventDetailSheet } from './MobileEventDetailSheet'
import { eventDateToLocal } from '@/lib/utils'
import type { CommissionOption } from '@/lib/commission-preferences'
import type { RelatedApunteLink } from '@/components/events/RelatedApunteLinks'

/** "YYYY-MM-DD" (o ISO) → Date local. Evita el off-by-one de `new Date(string)`. */
function toLocalDate(value: Date | string): Date {
  return typeof value === 'string' ? eventDateToLocal(value.slice(0, 10)) : value
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DOW_ES = [
  { key: 'sun', label: 'D', weekend: true },
  { key: 'mon', label: 'L', weekend: false },
  { key: 'tue', label: 'M', weekend: false },
  { key: 'wed', label: 'M', weekend: false },
  { key: 'thu', label: 'J', weekend: false },
  { key: 'fri', label: 'V', weekend: false },
  { key: 'sat', label: 'S', weekend: true },
]

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Orden por día y, dentro del día, por hora (los sin hora primero).
function byFechaHora(a: MobileCalendarEvent, b: MobileCalendarEvent): number {
  return a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? '')
}

interface CalendarCell {
  key: string
  d: number
  date: Date
  muted: boolean
}

function buildMonthCells(cursor: Date): CalendarCell[] {
  const firstDow = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const prevMonthDays = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate()
  const cells: CalendarCell[] = []

  for (let index = 0; index < firstDow; index++) {
    const day = prevMonthDays - firstDow + index + 1
    const date = new Date(cursor.getFullYear(), cursor.getMonth() - 1, day)
    cells.push({ key: date.toISOString(), d: day, date, muted: true })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day)
    cells.push({ key: date.toISOString(), d: day, date, muted: false })
  }
  while (cells.length < 42) {
    const day = cells.length - daysInMonth - firstDow + 1
    const date = new Date(cursor.getFullYear(), cursor.getMonth() + 1, day)
    cells.push({ key: date.toISOString(), d: day, date, muted: true })
  }

  return cells
}


export interface MobileCalendarEvent {
  id: string
  fecha: string
  hora: string | null
  titulo: string
  tipo: string
  tipoId?: string
  tituloOriginal?: string
  descripcionHtml?: string | null
  subjectId?: string
  subjectSlug?: string
  materiaNombre?: string
  yearId?: string
  yearSlug?: string
  commissionId?: string | null
  commissionSlug?: string | null
  commissionNombre?: string | null
  createdByUserId?: string | null
  createdByNombre?: string | null
  apuntes?: RelatedApunteLink[]
}

interface TipoEvento {
  id: string
  nombre: string
}

interface EventModalSubject {
  id: string
  slug: string
  nombre: string
  agendaId: string
  commissions: readonly CommissionOption[]
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
}

export interface MobileCalendarProps {
  events: MobileCalendarEvent[]
  accent: string
  initialDate?: Date | string
  initialSelected?: Date | string | null
  yearId?: string
  yearSlug?: string
  subjectSlug?: string
  agendaId?: string
  tiposEvento?: readonly TipoEvento[]
  subjects?: readonly EventModalSubject[]
  commissions?: readonly CommissionOption[]
}

export function MobileCalendar({
  events,
  accent,
  initialDate,
  initialSelected = null,
  yearId,
  yearSlug,
  subjectSlug,
  agendaId,
  tiposEvento,
  subjects,
  commissions,
}: MobileCalendarProps) {
  const [detailEvent, setDetailEvent] = useState<MobileCalendarEvent | null>(null)
  const [cursor, setCursor] = useState<Date>(() => {
    if (initialDate) {
      const d = toLocalDate(initialDate)
      d.setDate(1)
      return d
    }
    if (events && events.length > 0) {
      const d = eventDateToLocal(events[0].fecha)
      d.setDate(1)
      return d
    }
    const d = new Date()
    d.setDate(1)
    return d
  })

  const [selected, setSelected] = useState<Date | null>(() =>
    initialSelected ? toLocalDate(initialSelected) : null,
  )

  const monthEvents = useMemo(() => {
    return (events ?? []).filter((e) => {
      const d = eventDateToLocal(e.fecha)
      return (
        d.getMonth() === cursor.getMonth() &&
        d.getFullYear() === cursor.getFullYear()
      )
    })
  }, [events, cursor])

  const dayMap = useMemo(() => {
    const m: Record<number, MobileCalendarEvent[]> = {}
    monthEvents.forEach((e) => {
      const d = eventDateToLocal(e.fecha).getDate()
      ;(m[d] = m[d] ?? []).push(e)
    })
    return m
  }, [monthEvents])

  const cells = useMemo(() => buildMonthCells(cursor), [cursor])

  const today = new Date()

  const selectedEvents = selected
    ? (events ?? [])
        .filter((e) => sameDay(eventDateToLocal(e.fecha), selected))
        .toSorted(byFechaHora)
    : []

  const monthEventsSorted = monthEvents.toSorted(byFechaHora)

  const goPrev = () => {
    const d = new Date(cursor)
    d.setMonth(d.getMonth() - 1)
    setCursor(d)
  }
  const goNext = () => {
    const d = new Date(cursor)
    d.setMonth(d.getMonth() + 1)
    setCursor(d)
  }

  return (
    <div className="flex flex-col gap-3.5">
      <MobileCalendarHeader cursor={cursor} onNext={goNext} onPrev={goPrev} />

      <MobileCalendarCard
        accent={accent}
        cells={cells}
        cursor={cursor}
        dayMap={dayMap}
        selected={selected}
        today={today}
        onSelectDate={(date) => setSelected((current) => (current && sameDay(date, current) ? null : date))}
      />

      <MobileCalendarEventList
        cursor={cursor}
        monthEventsSorted={monthEventsSorted}
        selected={selected}
        selectedEvents={selectedEvents}
        yearId={yearId}
        onClearSelected={() => setSelected(null)}
        onOpenDetail={setDetailEvent}
      />

      <MobileEventDetailSheet
        event={detailEvent}
        open={Boolean(detailEvent)}
        onClose={() => setDetailEvent(null)}
        yearId={yearId}
        yearSlug={yearSlug}
        subjectSlug={subjectSlug}
        agendaId={agendaId}
        tiposEvento={tiposEvento}
        subjects={subjects}
        commissions={commissions}
      />
    </div>
  )
}


function MobileCalendarHeader({ cursor, onNext, onPrev }: { cursor: Date; onNext: () => void; onPrev: () => void }) {
  return (
    <div className="flex items-center justify-between px-[18px]">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">MES</p>
        <div className="mt-1 text-[22px] font-black leading-[1.1] tracking-[-0.02em] text-white">
          {MONTH_NAMES_ES[cursor.getMonth()]} <span className="font-bold text-white/40">{cursor.getFullYear()}</span>
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onPrev}
          aria-label="Mes anterior"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/[0.06] bg-[#1a1a1a] text-white/80 transition-colors hover:bg-[#222]"
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onNext}
          aria-label="Mes siguiente"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/[0.06] bg-[#1a1a1a] text-white/80 transition-colors hover:bg-[#222]"
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function MobileCalendarCard({
  accent,
  cells,
  cursor,
  dayMap,
  selected,
  today,
  onSelectDate,
}: {
  accent: string
  cells: CalendarCell[]
  cursor: Date
  dayMap: Record<number, MobileCalendarEvent[]>
  selected: Date | null
  today: Date
  onSelectDate: (date: Date) => void
}) {
  return (
    <div className="mx-[18px] rounded-xl border border-white/5 bg-[#1a1a1a]" style={{ padding: '12px 10px 14px' }}>
      <WeekdayStrip />
      <DayGrid
        accent={accent}
        cells={cells}
        cursor={cursor}
        dayMap={dayMap}
        selected={selected}
        today={today}
        onSelectDate={onSelectDate}
      />
      <CalendarLegend />
    </div>
  )
}

function WeekdayStrip() {
  return (
    <div className="mb-2 grid grid-cols-7 px-0.5">
      {DOW_ES.map((day) => (
        <div
          key={day.key}
          className="text-center text-[10px] font-extrabold uppercase tracking-[0.16em]"
          style={{ color: day.weekend ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.48)' }}
        >
          {day.label}
        </div>
      ))}
    </div>
  )
}

function DayGrid({
  accent,
  cells,
  cursor,
  dayMap,
  selected,
  today,
  onSelectDate,
}: {
  accent: string
  cells: CalendarCell[]
  cursor: Date
  dayMap: Record<number, MobileCalendarEvent[]>
  selected: Date | null
  today: Date
  onSelectDate: (date: Date) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-0.5">
      {cells.map((cell) => {
        const isToday = !cell.muted && sameDay(cell.date, today)
        const isSelected = !cell.muted && selected !== null && sameDay(cell.date, selected)
        const dayEvents = !cell.muted ? (dayMap[cell.d] ?? []) : []

        return (
          <DayButton
            key={cell.key}
            accent={accent}
            cell={cell}
            cursor={cursor}
            dayEvents={dayEvents}
            isSelected={isSelected}
            isToday={isToday}
            onSelectDate={onSelectDate}
          />
        )
      })}
    </div>
  )
}

function DayButton({
  accent,
  cell,
  dayEvents,
  isSelected,
  isToday,
  onSelectDate,
}: {
  accent: string
  cell: CalendarCell
  cursor: Date
  dayEvents: MobileCalendarEvent[]
  isSelected: boolean
  isToday: boolean
  onSelectDate: (date: Date) => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!cell.muted) onSelectDate(cell.date)
      }}
      disabled={cell.muted}
      className="flex aspect-square flex-col items-center justify-center rounded-md border-none p-0 transition-colors duration-[180ms]"
      style={{
        background: isSelected ? accent : 'transparent',
        color: cell.muted
          ? 'rgba(255,255,255,0.18)'
          : isSelected
            ? 'rgba(255,255,255,0.98)'
            : isToday
              ? accent
              : 'rgba(255,255,255,0.85)',
        cursor: cell.muted ? 'default' : 'pointer',
        fontSize: 14,
        fontWeight: isToday || isSelected ? 900 : 600,
      }}
    >
      <span className="leading-none">{cell.d}</span>
      {dayEvents.length > 0 ? <EventDots dayEvents={dayEvents} isSelected={isSelected} /> : null}
    </button>
  )
}

function EventDots({ dayEvents, isSelected }: { dayEvents: MobileCalendarEvent[]; isSelected: boolean }) {
  return (
    <span className="mt-1 flex h-1 gap-0.5">
      {dayEvents.slice(0, 3).map((event) => {
        const tone = getEventTone(event.tipo)
        return (
          <span
            key={event.id}
            className="size-1 rounded-full"
            style={{ background: isSelected ? 'rgba(0,0,0,0.55)' : tone.text }}
          />
        )
      })}
    </span>
  )
}

function CalendarLegend() {
  return (
    <div
      className="mt-3 flex flex-wrap gap-3 border-t border-white/5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/55"
      style={{ padding: '10px 4px 0' }}
    >
      {(
        [
          ['Examen', getEventTone('Examen')],
          ['Trabajo Práctico', getEventTone('Trabajo Práctico')],
          ['Exposición', getEventTone('Exposición')],
        ] as const
      ).map(([label, tone]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: tone.text }} />
          {label}
        </span>
      ))}
    </div>
  )
}

function MobileCalendarEventList({
  cursor,
  monthEventsSorted,
  selected,
  selectedEvents,
  yearId,
  onClearSelected,
  onOpenDetail,
}: {
  cursor: Date
  monthEventsSorted: MobileCalendarEvent[]
  selected: Date | null
  selectedEvents: MobileCalendarEvent[]
  yearId?: string
  onClearSelected: () => void
  onOpenDetail: (event: MobileCalendarEvent) => void
}) {
  return (
    <div style={{ padding: '4px 18px 0' }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">
          {selected
            ? selected.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', weekday: 'long' })
            : `Todos los eventos · ${MONTH_NAMES_ES[cursor.getMonth()]}`}
        </p>
        <MobileCalendarListActions selected={selected} yearId={yearId} onClearSelected={onClearSelected} />
      </div>
      <EventCards
        events={selected ? selectedEvents : monthEventsSorted}
        emptyText={selected ? 'Sin eventos este día.' : 'Sin eventos este mes.'}
        onOpenDetail={onOpenDetail}
      />
    </div>
  )
}

function MobileCalendarListActions({
  selected,
  yearId,
  onClearSelected,
}: {
  selected: Date | null
  yearId?: string
  onClearSelected: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {yearId ? (
        <AdminControls yearId={yearId} noWrapper>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-new-event'))}
            className="inline-flex h-6 cursor-pointer items-center justify-center rounded border border-white/10 bg-surface-1 px-2.5 text-[10px] font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            + Agregar evento
          </button>
        </AdminControls>
      ) : null}
      {selected ? (
        <button
          type="button"
          onClick={onClearSelected}
          className="relative cursor-pointer rounded-full border border-white/10 bg-transparent text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/70 before:absolute before:-inset-2 before:content-['']"
          style={{ height: 24, padding: '0 10px' }}
        >
          Ver mes
        </button>
      ) : null}
    </div>
  )
}

function EventCards({
  events,
  emptyText,
  onOpenDetail,
}: {
  events: MobileCalendarEvent[]
  emptyText: string
  onOpenDetail: (event: MobileCalendarEvent) => void
}) {
  if (events.length === 0) {
    return (
      <div className="mt-2.5 rounded-[10px] border border-dashed border-white/[0.08] bg-[#1a1a1a] text-[12.5px] text-white/48" style={{ padding: '16px 14px' }}>
        {emptyText}
      </div>
    )
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2">
      {events.map((event) => (
        <AgendaCard
          key={event.id}
          fecha={event.fecha}
          hora={event.hora}
          tipo={event.tipo}
          titulo={event.titulo}
          materia={event.materiaNombre}
          apuntes={event.apuntes}
          onClick={() => onOpenDetail(event)}
        />
      ))}
    </div>
  )
}
