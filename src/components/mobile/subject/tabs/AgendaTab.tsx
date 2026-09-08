'use client'

import { useMemo } from 'react'
import {
  MobileCalendar,
  type MobileCalendarEvent,
} from '@/components/mobile/calendar/MobileCalendar'
import { CalendarExportButton } from '@/components/calendar/CalendarExportButton'
import type { CalendarExportEvent } from '@/lib/calendar/ics'
import type { PeriodoCalendario } from '@/lib/periodos'
import {
  ALL_COMMISSIONS_VALUE,
  normalizePreferredCommissionId,
  writePreferredCommissionId,
  type CommissionOption,
} from '@/lib/commission-preferences'
import { usePreferredCommissionId } from '@/components/commissions/usePreferredCommission'
import { CommissionSelectField } from '@/components/commissions/CommissionSelectField'

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

export function AgendaTab({
  events,
  periodos,
  accent,
  yearId,
  yearSlug,
  subjectSlug,
  subjectName,
  agendaId,
  tiposEvento,
  subjects,
  commissions,
  activeCommissionName,
}: {
  events: MobileCalendarEvent[]
  periodos?: readonly PeriodoCalendario[]
  accent: string
  yearId: string
  yearSlug: string
  subjectSlug: string
  subjectName?: string
  agendaId: string
  tiposEvento: readonly TipoEvento[]
  subjects?: readonly EventModalSubject[]
  commissions: readonly CommissionOption[]
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
  activeCommissionName?: string
}) {
  const preferredCommissionId = usePreferredCommissionId(
    subjectSlug,
    commissions,
    Boolean(activeCommissionName),
  )

  const exportEvents: CalendarExportEvent[] = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        titulo: event.titulo,
        tituloOriginal: event.tituloOriginal ?? event.titulo,
        fecha: event.fecha,
        hora: event.hora,
        materiaNombre: event.materiaNombre ?? subjectName ?? subjectSlug,
        descripcion: event.descripcion,
        commissionNombre: event.commissionNombre,
      })),
    [events, subjectName, subjectSlug],
  )

  return (
    <div className="flex flex-col gap-6">
      {!activeCommissionName && commissions.length > 0 && (
        <div className="px-[18px]">
          <div className="rounded-xl bg-[#1a1a1a] border border-white/5 p-5">
            <CommissionSelectField
              id="mobile-subject-preferred-commission"
              label="Comisión"
              value={preferredCommissionId ?? ALL_COMMISSIONS_VALUE}
              commissions={commissions}
              onChange={(value) => {
                const nextCommissionId = normalizePreferredCommissionId(value)
                writePreferredCommissionId(subjectSlug, nextCommissionId)
              }}
              helperText="Esta elección solo ajusta las fechas que ves en esta materia."
            />
          </div>
        </div>
      )}

      <MobileCalendar
        events={events}
        periodos={periodos}
        accent={accent}
        initialDate={events[0]?.fecha}
        yearId={yearId}
        yearSlug={yearSlug}
        subjectSlug={subjectSlug}
        agendaId={agendaId}
        tiposEvento={tiposEvento}
        subjects={subjects}
        commissions={commissions}
        headerAction={
          <CalendarExportButton
            events={exportEvents}
            calendarName={`NextCampus · ${subjectName ?? subjectSlug}`}
            variant="mobile"
          />
        }
      />
    </div>
  )
}
