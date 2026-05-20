'use client'

import { MobileCalendarLazy } from '@/components/mobile/calendar/MobileCalendarLazy'

export function AgendaTab({
  events,
  accent,
}: {
  events: Array<{ id: string; titulo: string; fecha: Date | string; tipo: string }>
  accent: string
}) {
  return (
    <MobileCalendarLazy
      events={events}
      accent={accent}
      initialDate={events[0]?.fecha}
    />
  )
}

