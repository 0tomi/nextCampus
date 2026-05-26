'use client'

import Link from 'next/link'
import { CalendarDays, SlidersHorizontal } from 'lucide-react'
import { EventCalendar, type EventCalendarEvent } from '@/components/calendar/EventCalendar'
import { DarkCard } from '@/components/ui/DarkCard'
import { usePreferences } from '@/hooks/usePreferences'
import {
  isCommissionVisible,
  isSubjectVisible,
  type UserPreferences,
} from '@/lib/preferences'

export interface HomeGlobalCalendarEvent {
  id: string
  titulo: string
  fecha: Date | string
  tipo: string
  tipoId: string
  yearSlug: string
  subjectSlug: string
  subjectId: string
  materiaNombre: string
  descripcionHtml: string | null
  commissionSlug: string | null
  commissionNombre: string | null
}

interface HomeGlobalCalendarProps {
  initialPrefs: UserPreferences | null
  events: readonly HomeGlobalCalendarEvent[]
}

export function HomeGlobalCalendar({
  initialPrefs,
  events,
}: HomeGlobalCalendarProps) {
  const { prefs, isHydrated } = usePreferences(initialPrefs)
  const shouldWaitForStoredPrefs = !isHydrated && initialPrefs === null
  const effectivePrefs = isHydrated ? prefs : initialPrefs
  const hasConfiguredSubjects = effectivePrefs !== null

  if (shouldWaitForStoredPrefs) {
    return <HomeGlobalCalendarSkeleton />
  }

  if (!hasConfiguredSubjects) {
    return <HomeGlobalCalendarSetupNotice />
  }

  const visibleEvents = events.filter((event) => {
    if (!isSubjectVisible(event.yearSlug, event.subjectSlug, effectivePrefs)) {
      return false
    }

    if (!event.commissionSlug) {
      return true
    }

    return isCommissionVisible(
      event.yearSlug,
      event.subjectSlug,
      event.commissionSlug,
      effectivePrefs,
    )
  })

  const calendarEvents: EventCalendarEvent[] = visibleEvents.map((event) => ({
    id: event.id,
    titulo: `${event.titulo} · ${event.materiaNombre}`,
    tituloOriginal: event.titulo,
    fecha: event.fecha,
    tipo: event.tipo,
    tipoId: event.tipoId,
    subjectId: event.subjectId,
    subjectSlug: event.subjectSlug,
    materiaNombre: event.materiaNombre,
    descripcionHtml: event.descripcionHtml,
    commissionSlug: event.commissionSlug,
    commissionNombre: event.commissionNombre,
  }))

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
            Agenda
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Calendario de tus materias
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/50">
          Reunimos las fechas de los años, materias y comisiones que elegiste.
        </p>
      </div>

      <EventCalendar
        events={calendarEvents}
        emptyMessage="Por ahora no hay eventos con tu selección actual."
        className="home-global-calendar"
        dayMaxEvents={4}
      />
    </section>
  )
}

function HomeGlobalCalendarSetupNotice() {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
            Agenda
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Calendario de tus materias
          </h2>
        </div>
      </div>

      <DarkCard className="flex flex-col items-start gap-4 border-dashed p-6 sm:p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/70">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tight text-white">
            No tenés materias configuradas para tu calendario
          </h3>
          <p className="max-w-xl text-sm leading-6 text-white/55">
            Elegí qué años, materias y comisiones querés seguir para ver tus fechas importantes acá.
          </p>
        </div>
        <Link
          href="/configurar"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-uader-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-uader-red-light"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Configurar materias
        </Link>
      </DarkCard>
    </section>
  )
}

function HomeGlobalCalendarSkeleton() {
  return (
    <section className="space-y-4" aria-hidden="true">
      <div className="px-1">
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-8 w-80 max-w-full animate-pulse rounded bg-white/[0.06]" />
      </div>
      <DarkCard className="p-6">
        <div className="h-[440px] animate-pulse rounded bg-white/[0.04]" />
      </DarkCard>
    </section>
  )
}
