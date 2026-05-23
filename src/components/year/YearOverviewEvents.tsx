'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { EventCalendarAdmin } from '@/components/calendar/EventCalendarAdmin'
import { DarkCard } from '@/components/ui/DarkCard'
import { AdminControls } from '@/components/admin/AdminControls'
import {
  AdminTriggerButton,
  DeleteEventoButton,
} from '@/components/admin/SubjectPageAdminOverlay'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { formatDateTime } from '@/lib/utils'
import { sanitizeRichHtml } from '@/lib/sanitize'
import {
  filterEventsByPreferredCommission,
  type CommissionOption,
} from '@/lib/commission-preferences'
import { usePreferredCommissionMap } from '@/components/commissions/usePreferredCommission'

interface TipoEvento {
  id: string
  nombre: string
}

interface YearSubjectOption {
  id: string
  slug: string
  nombre: string
  agendaId: string
  commissions: CommissionOption[]
}

interface YearOverviewEvent {
  id: string
  titulo: string
  fecha: Date | string
  tipo: string
  tipoId?: string
  subjectSlug: string
  subjectId: string
  materiaNombre: string
  descripcionHtml?: string | null
  tituloOriginal?: string
  commissionId?: string | null
  commissionSlug?: string | null
  commissionNombre?: string | null
}

interface YearOverviewEventsProps {
  year: {
    id: string
    slug: string
  }
  tiposEvento: TipoEvento[]
  subjects: readonly YearSubjectOption[]
  events: readonly YearOverviewEvent[]
  nextEvents: readonly YearOverviewEvent[]
}

export function YearOverviewEvents({
  year,
  tiposEvento,
  subjects,
  events,
  nextEvents,
}: YearOverviewEventsProps) {
  const preferredBySubject = usePreferredCommissionMap(subjects)

  const subjectsById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject] as const)),
    [subjects],
  )
  const subjectsBySlug = useMemo(
    () => new Map(subjects.map((subject) => [subject.slug, subject] as const)),
    [subjects],
  )

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const subject =
          subjectsById.get(event.subjectId) ?? subjectsBySlug.get(event.subjectSlug) ?? null

        if (!subject) return true

        return filterEventsByPreferredCommission(
          [event],
          preferredBySubject[subject.slug] ?? null,
        ).length > 0
      }),
    [events, preferredBySubject, subjectsById, subjectsBySlug],
  )

  const filteredNextEvents = useMemo(
    () =>
      nextEvents
        .filter((event) => {
          const subject =
            subjectsById.get(event.subjectId) ?? subjectsBySlug.get(event.subjectSlug) ?? null

          if (!subject) return true

          return filterEventsByPreferredCommission(
            [event],
            preferredBySubject[subject.slug] ?? null,
          ).length > 0
        })
        .slice(0, 5),
    [nextEvents, preferredBySubject, subjectsById, subjectsBySlug],
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Agenda
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Calendario del año
            </h2>
            <AdminControls yearId={year.id}>
              <AdminTriggerButton
                action="new-event"
                className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Agregar nuevo evento
              </AdminTriggerButton>
            </AdminControls>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(324px,0.8fr)] 2xl:grid-cols-[minmax(0,1.82fr)_minmax(344px,0.78fr)]">
        <EventCalendarAdmin
          events={filteredEvents}
          emptyMessage="Todavía no hay eventos visibles a nivel año. Entrá a una materia para ver su agenda real."
          yearId={year.id}
          yearSlug={year.slug}
          tiposEvento={tiposEvento}
          subjects={subjects}
        />

        <div className="space-y-3 xl:min-w-[324px] 2xl:min-w-[344px]">
          {filteredNextEvents.length === 0 ? (
            <DarkCard className="p-5 text-sm leading-6 text-white/58">
              Por ahora no hay eventos próximos con la selección actual.
            </DarkCard>
          ) : (
            filteredNextEvents.map((evento) => (
              <DarkCard key={evento.id} className="p-4 2xl:p-[18px]">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
                        <span>{evento.tipo}</span>
                        <span>•</span>
                        <Link
                          href={buildSubjectHref({
                            yearSlug: year.slug,
                            subjectSlug: evento.subjectSlug,
                            commissionSlug: evento.commissionSlug,
                          })}
                          className="hover:text-white transition-colors"
                        >
                          {evento.materiaNombre}
                        </Link>
                        {evento.commissionNombre ? (
                          <>
                            <span>•</span>
                            <span>{evento.commissionNombre}</span>
                          </>
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-base font-black tracking-tight text-white leading-snug 2xl:text-lg">
                        {evento.titulo}
                      </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="inline-flex max-w-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] border-white/10 bg-surface-1 text-white/72">
                        {formatDateTime(evento.fecha)}
                      </span>
                      <DeleteEventoButton
                        eventoId={evento.id}
                        subjectSlug={evento.subjectSlug}
                        yearId={year.id}
                      />
                    </div>
                  </div>
                </div>

                {evento.descripcionHtml ? (
                  <div
                    className="space-y-2 text-sm leading-6 text-white/62 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichHtml(evento.descripcionHtml),
                    }}
                  />
                ) : null}
              </DarkCard>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
