'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getEventTone } from '@/components/mobile/shared/tokens'
import { AgendaCard } from '@/components/mobile/agenda/AgendaCard'
import { AdminControls } from '@/components/admin/AdminControls'
import { MobileEventDetailSheet } from './MobileEventDetailSheet'
import { eventDateToLocal } from '@/lib/utils'
import type { CommissionOption } from '@/lib/commission-preferences'

/** "YYYY-MM-DD" (o ISO) → Date local. Evita el off-by-one de `new Date(string)`. */
function toLocalDate(value: Date | string): Date {
  return typeof value === 'string' ? eventDateToLocal(value.slice(0, 10)) : value
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DOW_ES = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
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

  // Build 42 grid cells
  const firstDow = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const prevMonthDays = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate()

  const cells: { d: number; muted: boolean }[] = []
  for (let i = 0; i < firstDow; i++) {
    cells.push({ d: prevMonthDays - firstDow + i + 1, muted: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, muted: false })
  }
  while (cells.length < 42) {
    cells.push({ d: cells.length - daysInMonth - firstDow + 1, muted: true })
  }

  const today = new Date()

  // Orden por día y, dentro del día, por hora (los sin hora primero).
  const byFechaHora = (a: MobileCalendarEvent, b: MobileCalendarEvent) =>
    a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? '')

  const selectedEvents = selected
    ? (events ?? [])
        .filter((e) => sameDay(eventDateToLocal(e.fecha), selected))
        .sort(byFechaHora)
    : []

  const monthEventsSorted = [...monthEvents].sort(byFechaHora)

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
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-[18px]">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">
            MES
          </p>
          <div className="mt-1 text-[22px] font-black leading-[1.1] tracking-[-0.02em] text-white">
            {MONTH_NAMES_ES[cursor.getMonth()]}{' '}
            <span className="font-bold text-white/40">{cursor.getFullYear()}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={goPrev}
            aria-label="Mes anterior"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/[0.06] bg-[#1a1a1a] text-white/80 transition-colors hover:bg-[#222]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goNext}
            aria-label="Mes siguiente"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/[0.06] bg-[#1a1a1a] text-white/80 transition-colors hover:bg-[#222]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Calendar card ── */}
      <div
        className="mx-[18px] rounded-xl border border-white/5 bg-[#1a1a1a]"
        style={{ padding: '12px 10px 14px' }}
      >
        {/* Day-of-week strip */}
        <div className="mb-2 grid grid-cols-7 px-0.5">
          {DOW_ES.map((d, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-extrabold uppercase tracking-[0.16em]"
              style={{
                color:
                  i === 0 || i === 6
                    ? 'rgba(255,255,255,0.32)'
                    : 'rgba(255,255,255,0.48)',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, i) => {
            const dayDate = new Date(
              cursor.getFullYear(),
              cursor.getMonth() + (cell.muted && i < firstDow ? -1 : cell.muted ? 1 : 0),
              cell.d,
            )
            const isToday = !cell.muted && sameDay(dayDate, today)
            const isSelected = !cell.muted && selected !== null && sameDay(dayDate, selected)
            const dayEvents = !cell.muted ? (dayMap[cell.d] ?? []) : []

            return (
              <button
                key={i}
                onClick={() => {
                  if (cell.muted) return
                  if (isSelected) setSelected(null)
                  else setSelected(dayDate)
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
                  fontSize: 14,
                  fontWeight: isToday || isSelected ? 900 : 600,
                  cursor: cell.muted ? 'default' : 'pointer',
                }}
              >
                <span className="leading-none">{cell.d}</span>
                {dayEvents.length > 0 && (
                  <span className="mt-1 flex h-1 gap-0.5">
                    {dayEvents.slice(0, 3).map((e, j) => {
                      const tone = getEventTone(e.tipo)
                      return (
                        <span
                          key={j}
                          className="h-1 w-1 rounded-full"
                          style={{
                            background: isSelected
                              ? 'rgba(0,0,0,0.55)'
                              : tone.text,
                          }}
                        />
                      )
                    })}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
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
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: tone.text }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Event list ── */}
      <div style={{ padding: '4px 18px 0' }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">
            {selected
              ? selected.toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : `Todos los eventos · ${MONTH_NAMES_ES[cursor.getMonth()]}`}
          </p>
          <div className="flex items-center gap-2">
            {yearId && (
              <AdminControls yearId={yearId} noWrapper>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-new-event'))}
                  className="inline-flex items-center justify-center rounded border border-white/10 bg-surface-1 px-2.5 h-6 text-[10px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  + Agregar evento
                </button>
              </AdminControls>
            )}
            {selected && (
              <button
                onClick={() => setSelected(null)}
                className="relative cursor-pointer rounded-full border border-white/10 bg-transparent text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/70 before:absolute before:-inset-2 before:content-['']"
                style={{ height: 24, padding: '0 10px' }}
              >
                Ver mes
              </button>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-2">
          {selected ? (
            selectedEvents.length === 0 ? (
              <div
                className="rounded-[10px] border border-dashed border-white/[0.08] bg-[#1a1a1a] text-[12.5px] text-white/48"
                style={{ padding: '16px 14px' }}
              >
                Sin eventos este día.
              </div>
            ) : (
              selectedEvents.map((e) => (
                <AgendaCard
                  key={e.id}
                  fecha={e.fecha}
                  hora={e.hora}
                  tipo={e.tipo}
                  titulo={e.titulo}
                  materia={e.materiaNombre}
                  onClick={() => setDetailEvent(e)}
                />
              ))
            )
          ) : monthEventsSorted.length === 0 ? (
            <div
              className="rounded-[10px] border border-dashed border-white/[0.08] bg-[#1a1a1a] text-[12.5px] text-white/48"
              style={{ padding: '16px 14px' }}
            >
              Sin eventos este mes.
            </div>
          ) : (
            monthEventsSorted.map((e) => (
              <AgendaCard
                key={e.id}
                fecha={e.fecha}
                hora={e.hora}
                tipo={e.tipo}
                titulo={e.titulo}
                materia={e.materiaNombre}
                onClick={() => setDetailEvent(e)}
              />
            ))
          )}
        </div>
      </div>

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
