'use client'

import { MobileCalendar } from '@/components/mobile/calendar/MobileCalendar'

export function AgendaTab({
  events,
  accent,
}: {
  events: Array<{ id: string; titulo: string; fecha: Date | string; tipo: string }>
  accent: string
}) {
  if (events.length === 0) {
    return (
      <div className="px-[18px]">
        <div className="rounded-lg border border-dashed border-white/10 bg-[#1a1a1a] p-6 text-center text-sm text-white/45">
          Esta materia todavía no tiene eventos cargados.
        </div>
      </div>
    )
  }
  return <MobileCalendar events={events} accent={accent} initialDate={events[0]?.fecha} />
}
