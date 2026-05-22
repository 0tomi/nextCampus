'use client'

import { MobileCalendarLazy } from '@/components/mobile/calendar/MobileCalendarLazy'

export function AgendaTab({
  events,
  accent,
  yearId,
  subjectSlug,
}: {
  events: Array<{ id: string; titulo: string; fecha: Date | string; tipo: string }>
  accent: string
  yearId: string
  subjectSlug: string
}) {
  return (
    <MobileCalendarLazy
      events={events}
      accent={accent}
      initialDate={events[0]?.fecha}
      yearId={yearId}
      subjectSlug={subjectSlug}
    />
  )
}

