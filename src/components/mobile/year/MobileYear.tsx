'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, ChevronRight, Calendar, Layers, Pencil, Trash2, Plus } from 'lucide-react'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { AgendaCard } from '@/components/mobile/agenda/AgendaCard'
import { getYearColorClasses } from '@/lib/yearColors'
import { AdminControls } from '@/components/admin/AdminControls'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { MobileEventDetailSheet } from '@/components/mobile/calendar/MobileEventDetailSheet'
import type { MobileCalendarEvent } from '@/components/mobile/calendar/MobileCalendar'
import {
  filterEventsByPreferredCommission,
  type CommissionOption,
} from '@/lib/commission-preferences'
import { usePreferredCommissionMap } from '@/components/commissions/usePreferredCommission'
import { formatDescription } from '@/lib/text'
import { LinkFavicon } from '@/components/ui/LinkFavicon'
import { YearLatestApuntes } from '@/components/year/YearLatestApuntes'
import type { YearLatestApunteItem } from '@/lib/domain/year-page-adapters'
import type { YearLinkDTO } from '@/components/year/YearResourceLinks'

interface YearForMobile {
  id: string
  slug: string
  nombre: string
  descripcion?: string | null
  links: YearLinkDTO[]
  color?: string | null
  subjects: Array<{
    id: string
    slug: string
    nombre: string
    commissions: CommissionOption[]
    agenda: { id: string; eventos: Array<{ id: string; titulo: string; fecha: string; hora: string | null; tipoEventoId: string; tipoEvento: { nombre: string }; commissionId: string | null; commissionSlug: string | null; commissionNombre: string | null }> } | null
  }>
  career: { nombre: string }
}

interface AllYear {
  slug: string
  nombre: string
  color?: string | null
  subjectsCount: number
  orden: number
  subjects?: Array<{ id: string; slug: string; nombre: string }>
}

interface TipoEvento {
  id: string
  nombre: string
}

interface NextEvent {
  id: string
  titulo: string
  fecha: string
  hora: string | null
  tipo: string
  tipoId: string
  subjectId: string
  subjectSlug: string
  subjectNombre: string
  materiaNombre: string
  descripcionHtml?: string | null
  commissionId?: string | null
  commissionSlug?: string | null
  commissionNombre?: string | null
  yearId?: string
  yearSlug?: string
}

type YearColorClasses = ReturnType<typeof getYearColorClasses>
type YearSubject = YearForMobile['subjects'][number]
type FilteredYearSubject = YearSubject

function getYearNumber(allYears: AllYear[], yearSlug: string) {
  const yearIndex = allYears.findIndex((year) => year.slug === yearSlug)
  return yearIndex >= 0 ? yearIndex + 1 : 1
}

function getDrawerYears(allYears: AllYear[]): MobileShellDrawerYear[] {
  return allYears.map((year) => ({
    slug: year.slug,
    nombre: year.nombre,
    color: year.color,
    subjectsCount: year.subjectsCount,
    orden: year.orden,
    subjects: year.subjects,
  }))
}

function getModalSubjects(subjects: YearForMobile['subjects']) {
  return subjects.flatMap((subject) =>
    subject.agenda
      ? [
          {
            id: subject.id,
            slug: subject.slug,
            nombre: subject.nombre,
            agendaId: subject.agenda.id,
            commissions: subject.commissions,
          },
        ]
      : [],
  )
}

function toEventDetail(event: NextEvent, year: YearForMobile): MobileCalendarEvent {
  return {
    id: event.id,
    titulo: event.titulo,
    tituloOriginal: event.titulo,
    fecha: event.fecha,
    hora: event.hora,
    tipo: event.tipo,
    tipoId: event.tipoId,
    descripcionHtml: event.descripcionHtml ?? null,
    subjectId: event.subjectId,
    subjectSlug: event.subjectSlug,
    materiaNombre: event.materiaNombre || event.subjectNombre,
    yearId: year.id,
    yearSlug: year.slug,
    commissionId: event.commissionId ?? null,
    commissionSlug: event.commissionSlug ?? null,
    commissionNombre: event.commissionNombre ?? null,
  }
}

export function MobileYear({
  year,
  allYears,
  latestApuntes,
  nextEvents,
  careerName,
  tiposEvento,
}: {
  year: YearForMobile
  allYears: AllYear[]
  latestApuntes: readonly YearLatestApunteItem[]
  nextEvents: NextEvent[]
  careerName: string
  tiposEvento: readonly TipoEvento[]
}) {
  const [detailEvent, setDetailEvent] = useState<MobileCalendarEvent | null>(null)
  const colors = getYearColorClasses({ slug: year.slug, color: year.color })
  const preferredBySubject = usePreferredCommissionMap(year.subjects)
  const yearNumber = getYearNumber(allYears, year.slug)

  const subjectsById = useMemo(
    () => new Map(year.subjects.map((subject) => [subject.id, subject] as const)),
    [year.subjects],
  )
  const subjectsBySlug = useMemo(
    () => new Map(year.subjects.map((subject) => [subject.slug, subject] as const)),
    [year.subjects],
  )

  const filteredSubjects = useMemo(
    () =>
      year.subjects.map((subject) => ({
        ...subject,
        agenda: subject.agenda
          ? {
              ...subject.agenda,
              eventos: filterEventsByPreferredCommission(
                subject.agenda.eventos,
                preferredBySubject[subject.slug] ?? null,
              ),
            }
          : null,
      })),
    [preferredBySubject, year.subjects],
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

  const eventCount = filteredSubjects.reduce((acc, subject) => acc + (subject.agenda?.eventos.length ?? 0), 0)
  const drawerYears = useMemo(() => getDrawerYears(allYears), [allYears])
  const modalSubjects = useMemo(() => getModalSubjects(year.subjects), [year.subjects])

  return (
    <MobileShell
      title={year.nombre}
      subtitle={careerName}
      onBack="/"
      drawerYears={drawerYears}
      careerName={careerName}
      currentYearSlug={year.slug}
    >
      <div className="flex flex-col gap-7" style={colors.style}>
        <MobileYearHero colors={colors} eventCount={eventCount} year={year} yearNumber={yearNumber} />
        <MobileYearAgendaSection
          colors={colors}
          events={filteredNextEvents}
          year={year}
          onOpenEvent={(event) => setDetailEvent(toEventDetail(event, year))}
        />
        <YearLatestApuntes variant="mobile" notes={latestApuntes} />
        <MobileYearSubjectsSection colors={colors} subjects={filteredSubjects} yearSlug={year.slug} />
      </div>
      <MobileEventDetailSheet
        event={detailEvent}
        open={Boolean(detailEvent)}
        onClose={() => setDetailEvent(null)}
        yearId={year.id}
        yearSlug={year.slug}
        tiposEvento={tiposEvento}
        subjects={modalSubjects}
      />
    </MobileShell>
  )
}

function MobileYearHero({
  colors,
  eventCount,
  year,
  yearNumber,
}: {
  colors: YearColorClasses
  eventCount: number
  year: YearForMobile
  yearNumber: number
}) {
  return (
    <section className="px-[18px] pt-4">
      <div className={['relative overflow-hidden rounded-xl p-5 bg-gradient-to-r', colors.progressClassName].join(' ')}>
        <div className="pointer-events-none absolute -top-12 -right-10 size-40 rounded-full bg-white/20 blur-3xl" />
        <div className="relative">
          <MobileYearHeroHeader year={year} yearNumber={yearNumber} />
          <MobileYearStats eventCount={eventCount} subjectsCount={year.subjects.length} />
          {year.descripcion?.trim() ? (
            <p className="mt-4 text-sm leading-relaxed text-white/78">
              {formatDescription(year.descripcion.trim())}
            </p>
          ) : null}
          <MobileYearResourceLinks links={year.links} />
        </div>
      </div>
    </section>
  )
}

function MobileYearHeroHeader({ year, yearNumber }: { year: YearForMobile; yearNumber: number }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/72">
          Año {yearNumber} · {year.subjects.length} {year.subjects.length === 1 ? 'materia' : 'materias'}
        </p>
        <h1 className="mt-2 truncate text-2xl font-black leading-tight tracking-tight text-white">{year.nombre}</h1>
      </div>
      <AdminControls requireAcademicStructure noWrapper>
        <div className="mt-1 flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-edit-year'))}
            className="cursor-pointer rounded bg-black/20 p-2 text-white transition-colors hover:bg-black/35"
            title="Editar año"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-delete-year'))}
            className="cursor-pointer rounded bg-rose-500/20 p-2 text-rose-300 transition-colors hover:bg-rose-500/35"
            title="Eliminar año"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </AdminControls>
    </div>
  )
}

function MobileYearStats({ eventCount, subjectsCount }: { eventCount: number; subjectsCount: number }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-black/20 px-2.5 text-[11px] font-bold text-white">
        <Calendar size={12} strokeWidth={2.5} />
        {eventCount} {eventCount === 1 ? 'evento' : 'eventos'}
      </span>
      <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-black/20 px-2.5 text-[11px] font-bold text-white">
        <Layers size={12} strokeWidth={2.5} />
        {subjectsCount} {subjectsCount === 1 ? 'materia' : 'materias'}
      </span>
    </div>
  )
}

function MobileYearResourceLinks({ links }: { links: readonly YearLinkDTO[] }) {
  const safeLinks = links.filter((link) => /^https?:\/\//i.test(link.url.trim()))
  if (safeLinks.length === 0) return null

  return (
    <div className="mt-4 flex flex-col gap-2">
      {safeLinks.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-white/15 bg-black/20 px-3 text-sm font-bold text-white transition-colors hover:bg-black/30"
        >
          <LinkFavicon url={link.url} className="size-5 shrink-0 rounded-sm" />
          <span className="truncate">{link.label}</span>
        </a>
      ))}
    </div>
  )
}

function MobileYearAgendaSection({
  colors,
  events,
  year,
  onOpenEvent,
}: {
  colors: YearColorClasses
  events: NextEvent[]
  year: YearForMobile
  onOpenEvent: (event: NextEvent) => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <MobileYearSectionHeader
        action={
          <AdminControls yearId={year.id} noWrapper>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-new-event'))}
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-white/10 bg-surface-1 px-2.5 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Plus size={12} />
              Agregar evento
            </button>
          </AdminControls>
        }
        eyebrow="Agenda"
        title="Próximos eventos"
      />
      <MobileYearEventList events={events} onOpenEvent={onOpenEvent} />
      <MobileYearCalendarCta colors={colors} yearSlug={year.slug} />
    </section>
  )
}

function MobileYearSectionHeader({
  action,
  eyebrow,
  title,
}: {
  action?: React.ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <div className="flex items-center justify-between px-[18px]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-black text-white">{title}</h2>
      </div>
      {action}
    </div>
  )
}

function MobileYearEventList({ events, onOpenEvent }: { events: NextEvent[]; onOpenEvent: (event: NextEvent) => void }) {
  return (
    <div className="flex flex-col gap-2.5 px-[18px]">
      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-[#1a1a1a] p-4 text-center text-sm text-white/45">
          Por ahora no hay eventos próximos con la selección actual.
        </div>
      ) : (
        events.map((event) => (
          <AgendaCard
            key={event.id}
            fecha={event.fecha}
            hora={event.hora}
            tipo={event.tipo}
            titulo={event.titulo}
            materia={event.subjectNombre}
            onClick={() => onOpenEvent(event)}
          />
        ))
      )}
    </div>
  )
}

function MobileYearCalendarCta({ colors, yearSlug }: { colors: YearColorClasses; yearSlug: string }) {
  return (
    <div className="px-[18px]">
      <Link
        href={`/${yearSlug}/calendario`}
        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-[#1a1a1a] px-4 py-3.5 transition-colors hover:bg-[#1f1f1f]"
        style={{ borderColor: colors.tone }}
      >
        <div className="flex items-center gap-3">
          <span className={['flex size-9 items-center justify-center rounded-md bg-gradient-to-br', colors.badgeClassName].join(' ')}>
            <Calendar size={16} strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Calendario</p>
            <span className="text-sm font-bold text-white">Ver calendario completo</span>
          </div>
        </div>
        <ArrowRight size={18} strokeWidth={2.5} className="text-white/55" />
      </Link>
    </div>
  )
}

function MobileYearSubjectsSection({
  colors,
  subjects,
  yearSlug,
}: {
  colors: YearColorClasses
  subjects: FilteredYearSubject[]
  yearSlug: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="px-[18px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Materias</p>
        <h2 className="mt-1 text-lg font-black text-white">Accesos directos del año</h2>
      </div>
      <div className="flex flex-col gap-2.5 px-[18px]">
        {subjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-[#1a1a1a] p-4 text-center text-sm text-white/45">
            Este año todavía no tiene materias.
          </div>
        ) : (
          subjects.map((subject, index) => (
            <MobileYearSubjectLink
              key={subject.id}
              colors={colors}
              index={index}
              subject={subject}
              yearSlug={yearSlug}
            />
          ))
        )}
      </div>
    </section>
  )
}

function MobileYearSubjectLink({
  colors,
  index,
  subject,
  yearSlug,
}: {
  colors: YearColorClasses
  index: number
  subject: FilteredYearSubject
  yearSlug: string
}) {
  const ordinal = String(index + 1).padStart(2, '0')

  return (
    <Link
      href={buildSubjectHref({ yearSlug, subjectSlug: subject.slug })}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-[#1a1a1a] p-3 transition-colors hover:bg-[#1f1f1f]"
    >
      <span className={['flex size-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-[13px] font-black', colors.badgeClassName].join(' ')}>
        {ordinal}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Materia {ordinal}</p>
        <span className="block truncate text-sm font-bold leading-snug text-white">{subject.nombre}</span>
        <span className="mt-0.5 block text-[11px] font-semibold text-white/45">
          {subject.agenda?.eventos.length ?? 0} eventos
        </span>
      </div>
      <ChevronRight size={16} className="shrink-0 text-white/30" />
    </Link>
  )
}
