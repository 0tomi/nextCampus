'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CalendarDays, SlidersHorizontal } from 'lucide-react'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { YearCarousel } from './YearCarousel'
import { AgendaCard } from '@/components/mobile/agenda/AgendaCard'
import { HomeLatestApuntes, type HomeLatestApunte } from '@/components/home/HomeLatestApuntes'
import { AdminControls } from '@/components/admin/AdminControls'
import { AddYearButton } from '@/components/admin/HomeAdminOverlay'
import { MobileEventDetailSheet } from '@/components/mobile/calendar/MobileEventDetailSheet'
import type { MobileCalendarEvent } from '@/components/mobile/calendar/MobileCalendar'
import { Mascot } from '@/components/ui/Mascot'
import { usePreferences } from '@/hooks/usePreferences'
import { NosotrosModal } from '@/components/ui/NosotrosModal'
import {
  isCommissionVisible,
  isSubjectVisible,
  isYearVisible,
  type UserPreferences,
} from '@/lib/preferences'
import type { CommissionOption } from '@/lib/commission-preferences'

interface CareerForMobile {
  nombre: string
  descripcion: string | null
  years: Array<{
    id: string
    slug: string
    nombre: string
    orden: number
    subjects: Array<{
      id: string
      slug: string
      nombre: string
      descripcion: string | null
      driveUrl: string | null
      commissions: CommissionOption[]
    }>
  }>
}

interface TipoEvento {
  id: string
  nombre: string
}

interface UpcomingEvent {
  id: string
  titulo: string
  descripcionHtml: string | null
  fecha: string
  hora: string | null
  tipo: string
  tipoId: string
  subjectId: string
  subjectSlug: string
  subjectNombre: string
  yearId: string | null
  yearSlug: string | null
  commissionId: string | null
  commissionSlug: string | null
  commissionNombre: string | null
}

interface HomeCalendarEventForMobile {
  id: string
  agendaId: string
  subjectId: string
  subjectSlug: string
  materiaNombre: string
  yearId: string
  yearSlug: string
}

export function MobileHome({
  career,
  initialPrefs,
  upcomingEvents,
  tiposEvento,
  calendarEvents,
  latestApuntes,
  hasAnyNotes,
}: {
  career: CareerForMobile
  initialPrefs: UserPreferences | null
  upcomingEvents: UpcomingEvent[]
  tiposEvento: readonly TipoEvento[]
  calendarEvents: readonly HomeCalendarEventForMobile[]
  latestApuntes: readonly HomeLatestApunte[]
  hasAnyNotes: boolean
}) {
  const [detailEvent, setDetailEvent] = useState<MobileCalendarEvent | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const { prefs, isHydrated } = usePreferences(initialPrefs)
  const shouldWaitForStoredPrefs = !isHydrated && initialPrefs === null
  const effectivePrefs = isHydrated ? prefs : initialPrefs
  const hasConfiguredSubjects = effectivePrefs !== null

  if (shouldWaitForStoredPrefs) {
    return (
      <MobileShell
        title="NextCampus"
        subtitle={career.nombre}
        drawerYears={[]}
        careerName={career.nombre}
      >
        <MobileHomeSkeleton />
      </MobileShell>
    )
  }

  const visibleYears = career.years
        .filter((y) => isYearVisible(y.slug, effectivePrefs))
        .map((y) => ({
          ...y,
          subjects: y.subjects.filter((s) => isSubjectVisible(y.slug, s.slug, effectivePrefs)),
        }))

  const filteredUpcomingEvents = hasConfiguredSubjects
    ? upcomingEvents.filter((e) => {
        if (!e.yearSlug) return false
        if (!isYearVisible(e.yearSlug, effectivePrefs)) return false
        if (!isSubjectVisible(e.yearSlug, e.subjectSlug, effectivePrefs)) return false
        if (!e.commissionSlug) return true
        return isCommissionVisible(
          e.yearSlug,
          e.subjectSlug,
          e.commissionSlug,
          effectivePrefs,
        )
      }).slice(0, 6)
    : []

  const uniqueSubjectsInEvents = new Set(filteredUpcomingEvents.map((e) => e.subjectId)).size

  const totalSubjects = visibleYears.reduce((acc, y) => acc + y.subjects.length, 0)

  const drawerYears: MobileShellDrawerYear[] = visibleYears.map((y) => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjects.length,
    orden: y.orden,
    subjects: y.subjects,
  }))

  const agendaIdBySubjectId = new Map(
    calendarEvents.map((event) => [event.subjectId, event.agendaId] as const),
  )

  const modalSubjects = visibleYears.flatMap((year) =>
    year.subjects.flatMap((subject) => {
      const agendaId = agendaIdBySubjectId.get(subject.id)
      if (!agendaId) return []

      return [{
        id: subject.id,
        slug: subject.slug,
        nombre: subject.nombre,
        agendaId,
        commissions: subject.commissions,
      }]
    }),
  )

  const openEventDetail = (event: UpcomingEvent) => {
    setDetailEvent({
      id: event.id,
      titulo: event.titulo,
      tituloOriginal: event.titulo,
      fecha: event.fecha,
      hora: event.hora,
      tipo: event.tipo,
      tipoId: event.tipoId,
      descripcionHtml: event.descripcionHtml,
      subjectId: event.subjectId,
      subjectSlug: event.subjectSlug,
      materiaNombre: event.subjectNombre,
      yearId: event.yearId ?? undefined,
      yearSlug: event.yearSlug ?? undefined,
      commissionId: event.commissionId,
      commissionSlug: event.commissionSlug,
      commissionNombre: event.commissionNombre,
    })
  }

  if (visibleYears.length === 0) {
    return (
      <MobileShell
        title="NextCampus"
        subtitle={career.nombre}
        drawerYears={[]}
        careerName={career.nombre}
      >
        <div className="px-[18px] pt-6 flex flex-col gap-4">
          <div className="flex justify-center">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-3">
              <Mascot size={96} className="opacity-95" />
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            Inicio personalizado
          </p>
          <h2 className="text-2xl font-bold text-white">
            No tenés años o materias visibles
          </h2>
          <p className="text-sm leading-relaxed text-white/55">
            Elegí los que querés ver en tu inicio desde la pantalla de personalización.
          </p>
          <Link
            href="/configurar"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-uader-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-uader-red-light self-start"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Configurar
          </Link>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell
      title="NextCampus"
      subtitle={career.nombre}
      drawerYears={drawerYears}
      careerName={career.nombre}
    >
      <div className="flex flex-col gap-7">
        {/* HERO */}
        <section className="px-[18px] pt-4">
          <div className="relative overflow-hidden rounded-[24px] border border-white/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-4">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-orange-400/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 left-0 h-24 w-24 rounded-full bg-amber-200/8 blur-2xl" />
            <div className="relative min-h-[136px] pr-1 pb-12">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">CARRERA</p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white leading-tight">{career.nombre}</h1>
                {career.descripcion && (
                  <p className="mt-3 max-w-[26ch] text-sm leading-relaxed text-white/55">{career.descripcion}</p>
                )}
              </div>
              <div className="absolute bottom-[-14px] left-0 right-[-6px] flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setIsAboutOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Nosotros
                  </button>
                </div>
                <div className="pointer-events-auto">
                  <Mascot size={74} className="opacity-95" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRÓXIMOS EVENTOS */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Agenda</p>
            <h2 className="mt-1 text-lg font-black text-white">
              Próximos eventos - {uniqueSubjectsInEvents} {uniqueSubjectsInEvents === 1 ? 'Materia' : 'Materias'}
            </h2>
          </div>
          <div className="px-[18px] flex flex-col gap-2.5">
            {!hasConfiguredSubjects ? (
              <ConfigureAgendaNotice />
            ) : filteredUpcomingEvents.length === 0 ? (
              <EmptyAgenda />
            ) : (
              filteredUpcomingEvents.map((e) => (
                <AgendaCard
                  key={e.id}
                  fecha={e.fecha}
                  hora={e.hora}
                  tipo={e.tipo}
                  titulo={e.titulo}
                  materia={e.subjectNombre}
                  onClick={() => openEventDetail(e)}
                />
              ))
            )}
          </div>
        </section>

        {/* ÚLTIMOS APUNTES */}
        <HomeLatestApuntes
          variant="mobile"
          initialPrefs={initialPrefs}
          notes={latestApuntes}
          hasAnyNotes={hasAnyNotes}
        />

        {/* CAROUSEL */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Nivel</p>
              <h2 className="mt-1 text-lg font-black text-white">Años académicos</h2>
            </div>
            <AdminControls requireGlobal noWrapper>
              <AddYearButton />
            </AdminControls>
          </div>
          <YearCarousel years={visibleYears} />
        </section>
      </div>
      <MobileEventDetailSheet
        event={detailEvent}
        open={Boolean(detailEvent)}
        onClose={() => setDetailEvent(null)}
        yearId={detailEvent?.yearId}
        yearSlug={detailEvent?.yearSlug}
        subjectSlug={detailEvent?.subjectSlug}
        tiposEvento={tiposEvento}
        subjects={modalSubjects}
      />
      <NosotrosModal open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </MobileShell>
  )
}

function MobileHomeSkeleton() {
  return (
    <div className="flex flex-col gap-7 px-[18px] pt-4" aria-hidden="true">
      {/* Hero skeleton */}
      <section>
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-8 w-4/5 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
      </section>
      {/* Agenda skeleton */}
      <section className="flex flex-col gap-3">
        <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
        <div className="flex flex-col gap-2.5">
          <div className="h-[76px] animate-pulse rounded-lg border border-white/5 bg-[#1a1a1a]" />
          <div className="h-[76px] animate-pulse rounded-lg border border-white/5 bg-[#1a1a1a]" />
        </div>
      </section>
    </div>
  )
}

function EmptyAgenda() {
  return (
    <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-4 text-sm text-white/45 text-center">
      Por ahora no hay eventos próximos.
    </div>
  )
}

function ConfigureAgendaNotice() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-white/10 bg-[#1a1a1a] p-4">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/70">
        <CalendarDays className="h-4 w-4" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-black text-white">
          Configurá tus materias
        </h3>
        <p className="text-sm leading-relaxed text-white/55">
          Elegí qué años, materias y comisiones querés seguir para ver tus fechas acá.
        </p>
      </div>
      <Link
        href="/configurar"
        className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-uader-red px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-uader-red-light"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Configurar
      </Link>
    </div>
  )
}
