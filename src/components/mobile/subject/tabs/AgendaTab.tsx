'use client'

import dynamic from 'next/dynamic'

const MobileCalendar = dynamic(
  () => import('@/components/mobile/calendar/MobileCalendar').then(m => m.MobileCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="px-[18px]">
        <div className="h-72 rounded-xl bg-[#1a1a1a] border border-white/5 animate-pulse" />
      </div>
    ),
  }
)

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
        <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-6 text-sm text-white/45 text-center">
          Esta materia todavía no tiene eventos cargados.
        </div>
      </div>
    )
  }
  return <MobileCalendar events={events} accent={accent} initialDate={events[0]?.fecha} />
}
