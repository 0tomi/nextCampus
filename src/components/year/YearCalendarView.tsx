'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { EventCalendarAdmin } from '@/components/calendar/EventCalendarAdmin'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { MobileCalendarLazy } from '@/components/mobile/calendar/MobileCalendarLazy'
import {
  ALL_COMMISSIONS_VALUE,
  filterEventsByPreferredCommission,
  normalizePreferredCommissionId,
  type CommissionOption,
  writePreferredCommissionId,
} from '@/lib/commission-preferences'
import { CommissionSelectField } from '@/components/commissions/CommissionSelectField'
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

interface YearCalendarEvent {
  id: string
  titulo: string
  fecha: Date | string
  tipo: string
  tipoId: string
  subjectSlug: string
  subjectId: string
  materiaNombre: string
  descripcionHtml?: string | null
  tituloOriginal?: string
  commissionId?: string | null
  commissionSlug?: string | null
  commissionNombre?: string | null
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
}

export function YearCalendarView({
  year,
  allYears,
  sidebarItems,
  tone,
  tiposEvento,
  subjects,
  events,
}: YearCalendarViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? '')
  const preferredBySubject = usePreferredCommissionMap(subjects)

  const subjectsById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject] as const)),
    [subjects],
  )
  const subjectsBySlug = useMemo(
    () => new Map(subjects.map((subject) => [subject.slug, subject] as const)),
    [subjects],
  )
  const selectedSubject =
    subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null
  const selectedCommissionId = selectedSubject
    ? preferredBySubject[selectedSubject.slug] ?? null
    : null

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

  const renderControls = (idPrefix: string) => {
    if (!selectedSubject) return null

    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor={`${idPrefix}-subject`}
            className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40"
          >
            Materia
          </label>
          <select
            id={`${idPrefix}-subject`}
            value={selectedSubject.id}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            className="w-full cursor-pointer rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.nombre}
              </option>
            ))}
          </select>
        </div>

        <CommissionSelectField
          id={`${idPrefix}-commission`}
          label="Comisión"
          value={selectedCommissionId ?? ALL_COMMISSIONS_VALUE}
          commissions={selectedSubject.commissions}
          onChange={(value) =>
            writePreferredCommissionId(
              selectedSubject.slug,
              normalizePreferredCommissionId(value),
            )
          }
          helperText="Esto ajusta las fechas visibles de la materia elegida en este calendario."
        />
      </div>
    )
  }

  return (
    <>
      <div className="hidden lg:block">
        <DashboardShell
          topbar={
            <Link
              href={`/year/${year.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition-colors hover:text-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
              {year.nombre}
            </Link>
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
              <div className="w-full max-w-sm">{renderControls('desktop-year-calendar-preference')}</div>
            </div>
            <EventCalendarAdmin
              events={filteredEvents}
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
          onBack={`/year/${year.slug}`}
          drawerYears={allYears}
          careerName={year.career.nombre}
          currentYearSlug={year.slug}
        >
          <div className="space-y-4 px-[18px] pt-4">
            {renderControls('mobile-year-calendar-preference')}
          </div>
          <div className="pt-4">
            <MobileCalendarLazy
              events={filteredEvents.map((event) => ({
                id: event.id,
                fecha: event.fecha,
                titulo: event.titulo,
                tipo: event.tipo,
                subjectSlug: event.subjectSlug,
              }))}
              accent={tone}
              initialDate={filteredEvents[0]?.fecha}
              yearId={year.id}
            />
          </div>
        </MobileShell>
      </div>
    </>
  )
}
