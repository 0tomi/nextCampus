'use client'

import { Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  ICS_FILENAME,
  ICS_MIME_TYPE,
  type CalendarExportEvent,
  serializeCalendarToIcs,
} from '@/lib/calendar/ics'
import { filterUpcomingCalendarEvents } from '@/lib/calendar/calendar-export'
import { todayKeyAR } from '@/lib/utils'

export interface CalendarExportButtonProps {
  events: readonly CalendarExportEvent[]
  calendarName: string
  disabled?: boolean
  variant?: 'desktop' | 'mobile'
}

export function CalendarExportButton({
  events,
  calendarName,
  disabled = false,
  variant = 'desktop',
}: CalendarExportButtonProps) {
  function handleDownload() {
    if (disabled) return

    try {
      const upcomingEvents = filterUpcomingCalendarEvents(events, todayKeyAR())
      const ics = serializeCalendarToIcs(upcomingEvents, {
        calendarName,
        generatedAt: new Date(),
      })
      const url = URL.createObjectURL(new Blob([ics], { type: ICS_MIME_TYPE }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = ICS_FILENAME
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      toast.success(
        upcomingEvents.length > 0
          ? 'Calendario descargado.'
          : 'Descargamos un calendario sin próximos eventos.',
      )
    } catch {
      toast.error('No pudimos descargar el calendario. Probá de nuevo.')
    }
  }

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        aria-label="Descargar calendario"
        title="Descargar calendario"
        disabled={disabled}
        onClick={handleDownload}
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/[0.06] bg-[#1a1a1a] text-white/80 transition-colors hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download size={16} aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleDownload}
      className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded border border-white/10 bg-surface-3 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:border-white/14 hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download size={14} aria-hidden="true" />
      Descargar calendario
    </button>
  )
}
