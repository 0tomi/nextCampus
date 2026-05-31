'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { EventCalendar, type EventCalendarEvent } from '@/components/calendar/EventCalendar'
import { DarkCard } from '@/components/ui/DarkCard'
import { usePreferences } from '@/hooks/usePreferences'
import { cn, formatEventDateTime, todayKeyAR } from '@/lib/utils'
import { sanitizeRichHtml } from '@/lib/sanitize'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { RelatedApunteLinks, type RelatedApunteLink } from '@/components/events/RelatedApunteLinks'
import {
  isCommissionVisible,
  isSubjectVisible,
  type UserPreferences,
} from '@/lib/preferences'

export interface HomeGlobalCalendarEvent {
  id: string
  titulo: string
  fecha: string
  hora: string | null
  tipo: string
  tipoId: string
  yearNombre: string
  yearSlug: string
  subjectSlug: string
  subjectId: string
  materiaNombre: string
  descripcionHtml: string | null
  commissionSlug: string | null
  commissionNombre: string | null
  apuntes?: RelatedApunteLink[]
}

export function buildHomeCalendarEventHref(
  event: Pick<HomeGlobalCalendarEvent, 'yearSlug' | 'subjectSlug' | 'commissionSlug'>,
) {
  return buildSubjectHref({
    yearSlug: event.yearSlug,
    subjectSlug: event.subjectSlug,
    commissionSlug: event.commissionSlug,
  })
}

export function isHomeCalendarEventVisible(
  event: Pick<HomeGlobalCalendarEvent, 'yearSlug' | 'subjectSlug' | 'commissionSlug'>,
  prefs: UserPreferences | null,
) {
  if (!isSubjectVisible(event.yearSlug, event.subjectSlug, prefs)) {
    return false
  }

  if (!event.commissionSlug) {
    return true
  }

  return isCommissionVisible(
    event.yearSlug,
    event.subjectSlug,
    event.commissionSlug,
    prefs,
  )
}

interface HomeGlobalCalendarProps {
  initialPrefs: UserPreferences | null
  events: readonly HomeGlobalCalendarEvent[]
}

export function HomeGlobalCalendar({
  initialPrefs,
  events,
}: HomeGlobalCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()
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

  const visibleEvents = events.filter((event) =>
    isHomeCalendarEventVisible(event, effectivePrefs),
  )

  // Obtener los 5 eventos más cercanos a partir de hoy (ordenados cronológicamente)
  const todayKey = todayKeyAR()

  const upcomingEvents = [...visibleEvents]
    .filter((event) => event.fecha >= todayKey)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))

  const closestEvents = upcomingEvents.slice(0, 5)

  const calendarEvents: EventCalendarEvent[] = visibleEvents.map((event) => ({
    id: event.id,
    titulo: `${event.titulo} · ${event.materiaNombre}`,
    tituloOriginal: event.titulo,
    fecha: event.fecha,
    hora: event.hora,
    tipo: event.tipo,
    tipoId: event.tipoId,
    yearSlug: event.yearSlug,
    subjectId: event.subjectId,
    subjectSlug: event.subjectSlug,
    materiaNombre: event.materiaNombre,
    descripcionHtml: event.descripcionHtml,
    commissionSlug: event.commissionSlug,
    commissionNombre: event.commissionNombre,
    apuntes: event.apuntes,
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

      <div className="flex flex-col gap-6">
        {/* Tarjetas de eventos */}
        <div className="w-full grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {closestEvents.length === 0 ? (
            <DarkCard className="col-span-full p-6 py-16 text-sm leading-6 text-white/50 text-center border-dashed flex flex-col items-center justify-center gap-2">
              <CalendarDays className="h-6 w-6 opacity-40" />
              <span>No hay eventos próximos en tu agenda.</span>
            </DarkCard>
          ) : (
            closestEvents.map((evento) => (
              <DarkCard
                key={evento.id}
                className="group relative flex min-h-[140px] flex-col justify-between rounded-lg border border-white/5 bg-surface-1/60 p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-surface-1"
              >
                <Link
                  href={buildHomeCalendarEventHref(evento)}
                  aria-label={`Abrir ${evento.materiaNombre}`}
                  className="absolute inset-0 z-10 block cursor-pointer rounded-lg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                />

                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[8px] font-bold tracking-wider",
                        evento.tipo.toLowerCase() === 'examen' ||
                        evento.tipo.toLowerCase() === 'parcial' ||
                        evento.tipo.toLowerCase() === 'final' ||
                        evento.tipo.toLowerCase() === 'recuperatorio'
                          ? 'border-red-500/20 bg-red-500/10 text-red-400'
                          : evento.tipo.toLowerCase() === 'trabajo práctico' ||
                            evento.tipo.toLowerCase() === 'tp' ||
                            evento.tipo.toLowerCase() === 'trabajo practico' ||
                            evento.tipo.toLowerCase() === 'entrega'
                            ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      )}
                    >
                      {evento.tipo}
                    </span>
                    <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white/65">
                      {evento.yearNombre}
                    </span>
                    <span>•</span>
                    <span
                      className="max-w-[120px] truncate text-white/55 transition-colors group-hover:text-white"
                      title={evento.materiaNombre}
                    >
                      {evento.materiaNombre}
                    </span>
                    {evento.commissionNombre ? (
                      <>
                        <span>•</span>
                        <span className="max-w-[80px] truncate" title={evento.commissionNombre}>
                          {evento.commissionNombre}
                        </span>
                      </>
                    ) : null}
                  </div>

                  <h3 className="line-clamp-2 text-sm leading-snug font-black tracking-tight text-white transition-colors group-hover:text-white">
                    {evento.titulo}
                  </h3>

                  {evento.descripcionHtml ? (
                    <div
                      className="text-xs leading-relaxed text-white/55 line-clamp-2 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichHtml(evento.descripcionHtml),
                      }}
                    />
                  ) : null}
                  <RelatedApunteLinks apuntes={evento.apuntes} />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-2.5">
                  <span className="inline-flex max-w-full rounded border border-white/8 bg-white/[0.02] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-white/60">
                    {formatEventDateTime(evento.fecha, evento.hora)}
                  </span>
                </div>
              </DarkCard>
            ))
          )}
        </div>

        {/* Calendario condicional */}
        {isExpanded && (
          <div className="w-full">
            <EventCalendar
              events={calendarEvents}
              emptyMessage="Por ahora no hay eventos con tu selección actual."
              className="home-global-calendar"
              dayMaxEvents={4}
              onEventClick={(event) => {
                if (!event.yearSlug || !event.subjectSlug) {
                  return
                }

                router.push(
                  buildSubjectHref({
                    yearSlug: event.yearSlug,
                    subjectSlug: event.subjectSlug,
                    commissionSlug: event.commissionSlug,
                  }),
                )
              }}
            />
          </div>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-white/80 transition-all hover:bg-white/10 hover:text-white"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 text-white/60" />
              Ocultar calendario completo
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 text-white/60" />
              Ver calendario completo
            </>
          )}
        </button>
      </div>
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
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
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
