'use client'

import { useMemo } from 'react'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { SubjectTabs } from './SubjectTabs'
import { getYearColorClasses } from '@/lib/yearColors'
import { Pencil, Plus } from 'lucide-react'
import { AdminControls } from '@/components/admin/AdminControls'
import { formatDescription } from '@/lib/text'
import {
  filterEventsByPreferredCommission,
  type CommissionOption,
} from '@/lib/commission-preferences'
import { usePreferredCommissionId } from '@/components/commissions/usePreferredCommission'
import type { RelatedApunteLink } from '@/components/events/RelatedApunteLinks'
import type { PeriodoCalendario } from '@/lib/periodos'
import type { SubjectLinkDTO } from '@/lib/subjectLinks'
import { SubjectLinkButtons } from '@/components/subject/SubjectLinkButtons'
import type { RecursoTipo } from '@/lib/recursos'

interface SubjectForMobile {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  links: SubjectLinkDTO[]
  year: { id: string; slug: string; nombre: string; color?: string | null; career: { nombre: string } }
  agenda: { id: string; eventos: Array<{ id: string; titulo: string; descripcionHtml: string | null; fecha: string; hora: string | null; tipoEventoId: string; tipoEvento: { nombre: string }; commissionId?: string | null; commissionSlug?: string | null; commissionNombre?: string | null; createdByUserId?: string | null; createdByNombre?: string | null; apuntes?: RelatedApunteLink[] }> } | null
  apuntes: Array<{
    id: string
    titulo: string
    slug: string
    descripcionHtml: string | null
    createdAt: string
    createdByUserId: string | null
    categorias: Array<{ id: string; nombre: string }>
    recursos: Array<{ id: string; tipo: RecursoTipo; url: string; orden: number; nombre: string | null; storageKey?: string | null; mimeType?: string | null; sizeBytes?: number | null }>
  }>
  categoriasDisponibles: Array<{ id: string; nombre: string }>
  apuntesHasMore: boolean
  apuntesNextCursor: string | null
  apuntesTotal: number
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

interface SubjectMobileEvent {
  id: string
  titulo: string
  descripcionHtml: string | null
  fecha: string
  hora: string | null
  tipoEventoId: string
  tipoEvento: { nombre: string }
  commissionId?: string | null
  commissionSlug?: string | null
  commissionNombre?: string | null
  createdByUserId?: string | null
  createdByNombre?: string | null
  apuntes?: RelatedApunteLink[]
}


export function MobileSubject({
  subject,
  allYears,
  commissions,
  events,
  periodos,
  activeCommissionName,
  tiposEvento,
  focusApunteSlug,
}: {
  subject: SubjectForMobile
  allYears: AllYear[]
  commissions: CommissionOption[]
  events?: SubjectMobileEvent[]
  periodos?: readonly PeriodoCalendario[]
  activeCommissionName?: string
  tiposEvento: readonly TipoEvento[]
  focusApunteSlug?: string
}) {
  const colors = getYearColorClasses({ slug: subject.year.slug, color: subject.year.color })
  const drawerYears: MobileShellDrawerYear[] = allYears.map((y) => ({
    slug: y.slug,
    nombre: y.nombre,
    color: y.color,
    subjectsCount: y.subjectsCount,
    orden: y.orden,
    subjects: y.subjects,
  }))
  const preferredCommissionId = usePreferredCommissionId(
    subject.slug,
    commissions,
    Boolean(activeCommissionName),
  )

  const eventosBase = useMemo<SubjectMobileEvent[]>(
    () => (events ?? subject.agenda?.eventos ?? []) as SubjectMobileEvent[],
    [events, subject.agenda?.eventos],
  )
  const selectedCommission = useMemo(
    () => commissions.find((commission) => commission.id === preferredCommissionId) ?? null,
    [commissions, preferredCommissionId],
  )
  const eventos = useMemo(() => {
    if (activeCommissionName) {
      return eventosBase
    }

    return filterEventsByPreferredCommission(eventosBase, preferredCommissionId)
  }, [activeCommissionName, eventosBase, preferredCommissionId])

  return (
    <MobileShell
      title={subject.nombre}
      subtitle={subject.year.nombre}
      onBack={`/${subject.year.slug}`}
      drawerYears={drawerYears}
      careerName={subject.year.career.nombre}
      currentYearSlug={subject.year.slug}
    >
      <div className="flex flex-col gap-6" style={colors.style}>
        {/* HERO */}
        <section className="px-[18px] pt-4">
          <div className="rounded-xl bg-[#1a1a1a] border border-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={['inline-flex px-3 py-1 border text-[10px] font-bold uppercase tracking-[0.2em] rounded', colors.chipClassName].join(' ')}
                >
                  {subject.year.nombre}
                </span>
                {activeCommissionName ? (
                  <span className="inline-flex rounded border border-white/10 bg-surface-1 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/68">
                    {activeCommissionName}
                  </span>
                ) : selectedCommission ? (
                  <span className="inline-flex rounded border border-white/10 bg-surface-1 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/68">
                    {selectedCommission.nombre}
                  </span>
                ) : null}
              </div>
              <AdminControls yearId={subject.year.id} requireAcademicStructure noWrapper>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-new-commission'))}
                    className="p-2 rounded bg-black/20 text-white/70 hover:bg-black/35 transition-colors cursor-pointer"
                    title="Nueva comisión"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-edit-subject'))}
                    className="p-2 rounded bg-black/20 text-white/70 hover:bg-black/35 transition-colors cursor-pointer"
                    title="Editar materia"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </AdminControls>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white leading-tight">
              {subject.nombre}
            </h1>
            {subject.descripcion ? (
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {formatDescription(subject.descripcion)}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Agenda, unidades y apuntes organizados para que puedas estudiar y practicar en una sola vista.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <SubjectLinkButtons links={subject.links} variant="mobile" />
              <AdminControls yearId={subject.year.id} requireAcademicStructure noWrapper>
                {subject.links.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-edit-subject'))}
                    className="flex items-center justify-center size-11 shrink-0 rounded-md bg-white/[0.04] border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors"
                    title="Editar materia"
                  >
                    <Pencil className="size-4 text-white/70" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-edit-subject'))}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-white/[0.04] border border-white/10 text-sm font-bold text-white cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <Plus className="size-4 text-white/70" />
                    Agregar enlaces
                  </button>
                )}
              </AdminControls>
            </div>
             <div className="mt-4 grid grid-cols-2 divide-x divide-white/5">
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Eventos</span>
                <span className="text-lg font-black text-white">{eventos.length}</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Apuntes</span>
                <span className="text-lg font-black text-white">{subject.apuntesTotal}</span>
              </div>
             </div>
          </div>
        </section>

        {/* TABS */}
        <SubjectTabs
          subjectId={subject.id}
          subjectSlug={subject.slug}
          subjectName={subject.nombre}
          yearSlug={subject.year.slug}
          yearColor={subject.year.color}
          yearId={subject.year.id}
          agendaId={subject.agenda?.id ?? ''}
          events={eventos.map(e => ({
            id: e.id,
            titulo: e.titulo,
            tituloOriginal: e.titulo,
            fecha: e.fecha,
            hora: e.hora,
            tipo: e.tipoEvento.nombre,
            tipoId: e.tipoEventoId,
            descripcionHtml: e.descripcionHtml,
            subjectId: subject.id,
            subjectSlug: subject.slug,
            materiaNombre: subject.nombre,
            yearId: subject.year.id,
            yearSlug: subject.year.slug,
            commissionId: e.commissionId ?? null,
            commissionSlug: e.commissionSlug ?? null,
            commissionNombre: e.commissionNombre ?? null,
            createdByUserId: e.createdByUserId ?? null,
            createdByNombre: e.createdByNombre ?? null,
            apuntes: e.apuntes,
          }))}
          periodos={periodos}
          apuntes={subject.apuntes}
          categorias={subject.categoriasDisponibles}
          apuntesHasMore={subject.apuntesHasMore}
          apuntesNextCursor={subject.apuntesNextCursor}
          focusApunteSlug={focusApunteSlug}
          tiposEvento={tiposEvento}
          subjects={[{
            id: subject.id,
            slug: subject.slug,
            nombre: subject.nombre,
            agendaId: subject.agenda?.id ?? '',
            commissions,
            categoriasDisponibles: subject.categoriasDisponibles,
          }]}
          commissions={commissions}
          activeCommissionName={activeCommissionName}
        />
      </div>
    </MobileShell>
  )
}
