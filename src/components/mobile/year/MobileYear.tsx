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

interface YearForMobile {
  id: string
  slug: string
  nombre: string
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

export function MobileYear({
  year,
  allYears,
  nextEvents,
  careerName,
  tiposEvento,
}: {
  year: YearForMobile
  allYears: AllYear[]
  nextEvents: NextEvent[]
  careerName: string
  tiposEvento: readonly TipoEvento[]
}) {
  const [detailEvent, setDetailEvent] = useState<MobileCalendarEvent | null>(null)
  const colors = getYearColorClasses(year.slug)
  const preferredBySubject = usePreferredCommissionMap(year.subjects)
  const yearIndex = allYears.findIndex(y => y.slug === year.slug)
  const yearNumber = yearIndex >= 0 ? yearIndex + 1 : 1

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

  const drawerYears: MobileShellDrawerYear[] = allYears.map(y => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjectsCount,
    orden: y.orden,
    subjects: y.subjects,
  }))

  const modalSubjects = year.subjects
    .filter((subject) => subject.agenda !== null)
    .map((subject) => ({
      id: subject.id,
      slug: subject.slug,
      nombre: subject.nombre,
      agendaId: subject.agenda!.id,
      commissions: subject.commissions,
    }))

  const openEventDetail = (event: NextEvent) => {
    setDetailEvent({
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
    })
  }

  return (
    <MobileShell
      title={year.nombre}
      subtitle={careerName}
      onBack="/"
      drawerYears={drawerYears}
      careerName={careerName}
      currentYearSlug={year.slug}
    >
      <div className="flex flex-col gap-7">
        {/* HERO gradient */}
        <section className="px-[18px] pt-4">
          <div
            className={['relative overflow-hidden rounded-xl p-5 bg-gradient-to-r', colors.progressClassName].join(' ')}
          >
            <div className="absolute -top-12 -right-10 size-40 rounded-full bg-white/20 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/72">
                    Año {yearNumber} · {year.subjects.length} {year.subjects.length === 1 ? 'materia' : 'materias'}
                  </p>
                  <h1 className="mt-2 truncate text-2xl font-black leading-tight tracking-tight text-white">
                    {year.nombre}
                  </h1>
                </div>
                <AdminControls yearId={year.id} noWrapper>
                  <div className="flex gap-1 shrink-0 mt-1">
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
                      className="p-2 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/35 transition-colors cursor-pointer"
                      title="Eliminar año"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </AdminControls>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-black/20 text-white text-[11px] font-bold">
                  <Calendar size={12} strokeWidth={2.5} />
                  {eventCount} {eventCount === 1 ? 'evento' : 'eventos'}
                </span>
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-black/20 text-white text-[11px] font-bold">
                  <Layers size={12} strokeWidth={2.5} />
                  {year.subjects.length} {year.subjects.length === 1 ? 'materia' : 'materias'}
                </span>
              </div>
            </div>
          </div>
        </section>
        
        {/* PRÓXIMOS 3 EVENTOS + CTA calendario */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Agenda</p>
              <h2 className="mt-1 text-lg font-black text-white">Próximos eventos</h2>
            </div>
            <AdminControls yearId={year.id} noWrapper>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-new-event'))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-white/10 bg-surface-1 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <Plus size={12} />
                Agregar evento
              </button>
            </AdminControls>
          </div>
          <div className="px-[18px] flex flex-col gap-2.5">
            {filteredNextEvents.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-4 text-sm text-white/45 text-center">
                Por ahora no hay eventos próximos con la selección actual.
              </div>
            ) : (
              filteredNextEvents.map(e => (
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

          <div className="px-[18px]">
            <Link
              href={`/${year.slug}/calendario`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-[#1a1a1a] border cursor-pointer hover:bg-[#1f1f1f] transition-colors"
              style={{ borderColor: colors.tone }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={['flex items-center justify-center w-9 h-9 rounded-md bg-gradient-to-br', colors.badgeClassName].join(' ')}
                >
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
        </section>

        {/* MATERIAS DEL AÑO */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Materias</p>
            <h2 className="mt-1 text-lg font-black text-white">Accesos directos del año</h2>
          </div>
          <div className="px-[18px] flex flex-col gap-2.5">
            {year.subjects.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-4 text-sm text-white/45 text-center">
                Este año todavía no tiene materias.
              </div>
            ) : (
              filteredSubjects.map((s, idx) => (
                <Link
                  key={s.id}
                  href={buildSubjectHref({
                    yearSlug: year.slug,
                    subjectSlug: s.slug,
                  })}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] border border-white/5 cursor-pointer hover:bg-[#1f1f1f] transition-colors"
                >
                  <span
                    className={['flex items-center justify-center w-10 h-10 shrink-0 rounded-md bg-gradient-to-br text-[13px] font-black', colors.badgeClassName].join(' ')}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                      Materia {String(idx + 1).padStart(2, '0')}
                    </p>
                    <span className="block text-sm font-bold text-white leading-snug truncate">{s.nombre}</span>
                    <span className="block text-[11px] font-semibold text-white/45 mt-0.5">
                      {s.agenda?.eventos.length ?? 0} eventos
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-white/30 shrink-0" />
                </Link>
              ))
            )}
          </div>
        </section>
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
