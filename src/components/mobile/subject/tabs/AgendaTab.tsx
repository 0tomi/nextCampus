'use client'

import { MobileCalendarLazy } from '@/components/mobile/calendar/MobileCalendarLazy'
import type { MobileCalendarEvent } from '@/components/mobile/calendar/MobileCalendar'
import type { CommissionOption } from '@/lib/commission-preferences'

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
  accent,
  yearId,
  yearSlug,
  subjectSlug,
  agendaId,
  tiposEvento,
  subjects,
  commissions,
}: {
  events: MobileCalendarEvent[]
  accent: string
  yearId: string
  yearSlug: string
  subjectSlug: string
  agendaId: string
  tiposEvento: readonly TipoEvento[]
  subjects?: readonly EventModalSubject[]
  commissions: readonly CommissionOption[]
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
}) {
  return (
    <MobileCalendarLazy
      events={events}
      accent={accent}
      initialDate={events[0]?.fecha}
      yearId={yearId}
      yearSlug={yearSlug}
      subjectSlug={subjectSlug}
      agendaId={agendaId}
      tiposEvento={tiposEvento}
      subjects={subjects}
      commissions={commissions}
    />
  )
}
