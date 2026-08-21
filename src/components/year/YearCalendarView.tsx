'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { EventCalendarAdmin } from '@/components/calendar/EventCalendarAdmin'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { MobileCalendar } from '@/components/mobile/calendar/MobileCalendar'
import { InstallPWATopbarButton } from '@/components/pwa/InstallPWA'
import {
  filterEventsByPreferredCommission,
  type CommissionOption,
} from '@/lib/commission-preferences'
import { usePreferredCommissionMap } from '@/components/commissions/usePreferredCommission'
import type { RelatedApunteLink } from '@/components/events/RelatedApunteLinks'
import type { PeriodoCalendario } from '@/lib/periodos'

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
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
}

interface YearCalendarEvent {
  id: string
  titulo: string
  fecha: string
  hora: string | null
  tipo: string
  tipoId: string
  subjectSlug: string
  subjectId: string
  materiaNombre: string
  descripcion?: string | null
  tituloOriginal?: string
  commissionId?: string | null
  commissionSlug?: string | null
  commissionNombre?: string | null
  createdByUserId?: string | null
  apuntes?: RelatedApunteLink[]
}

interface YearCalendarViewProps {
  year: {
    id: string
    slug: string
    nombre: string
    career: {
      nombre: string
    }
  }
  allYears: MobileShellDrawerYear[]
  sidebarItems: Array<{
    id: string
    href: string
    label: string
    badge: string
    meta: string
    badgeClassName: string
  }>
  tone: string
  tiposEvento: TipoEvento[]
  subjects: readonly YearSubjectOption[]
  events: readonly YearCalendarEvent[]
  periodos: readonly PeriodoCalendario[]
}

export function YearCalendarView({
  year,
  allYears,
  sidebarItems,
  tone,
  tiposEvento,
  subjects,
  events,
  periodos,
}: YearCalendarViewProps) {
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

  return (
    <>
      <div className="hidden lg:block">
        <DashboardShell
          topbar={
            <div className="flex items-center gap-4">
              <Link
                href={`/${year.slug}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition-colors hover:text-white/80"
              >
                <ArrowLeft className="size-4" />
                {year.nombre}
              </Link>
              <InstallPWATopbarButton />
            </div>
          }
          sidebar={
            <Sidebar
              eyebrow="Navegación"
              title={year.nombre}
              items={sidebarItems}
            />
          }
          mainClassName="space-y-8"
        >
          <section className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
                  Agenda
                </p>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Calendario completo · {year.nombre}
                </h1>
              </div>
            </div>
            <EventCalendarAdmin
              events={filteredEvents}
              periodos={periodos}
              emptyMessage="Todavía no hay eventos cargados en este año."
              className="year-calendar-expanded"
              dayMaxEvents={4}
              yearSlug={year.slug}
              tiposEvento={tiposEvento}
              subjects={subjects}
            />
          </section>
        </DashboardShell>
      </div>

      <div className="lg:hidden">
        <MobileShell
          title="Calendario"
          subtitle={year.nombre}
          onBack={`/${year.slug}`}
          drawerYears={allYears}
          careerName={year.career.nombre}
          currentYearSlug={year.slug}
        >
          <div className="pt-4">
            <MobileCalendar
              events={filteredEvents.map((event) => ({
                id: event.id,
                fecha: event.fecha,
                hora: event.hora,
                titulo: event.titulo,
                tituloOriginal: event.tituloOriginal ?? event.titulo,
                tipo: event.tipo,
                tipoId: event.tipoId,
                descripcion: event.descripcion,
                subjectId: event.subjectId,
                subjectSlug: event.subjectSlug,
                materiaNombre: event.materiaNombre,
                yearId: year.id,
                yearSlug: year.slug,
                commissionId: event.commissionId ?? null,
                commissionSlug: event.commissionSlug ?? null,
                commissionNombre: event.commissionNombre ?? null,
                createdByUserId: event.createdByUserId ?? null,
                apuntes: event.apuntes,
              }))}
              periodos={periodos}
              accent={tone}
              initialDate={filteredEvents[0]?.fecha}
              yearId={year.id}
              yearSlug={year.slug}
              tiposEvento={tiposEvento}
              subjects={subjects}
            />
          </div>
        </MobileShell>
      </div>
    </>
  )
}
