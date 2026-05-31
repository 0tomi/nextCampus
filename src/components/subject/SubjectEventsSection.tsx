'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { EventCalendarAdmin } from '@/components/calendar/EventCalendarAdmin'
import type { EventCalendarEvent } from '@/components/calendar/EventCalendar'
import { DarkCard } from '@/components/ui/DarkCard'
import {
  AdminTriggerButton,
  DeleteEventoButton,
} from '@/components/admin/SubjectPageAdminOverlay'
import { AdminControls } from '@/components/admin/AdminControls'
import { sanitizeRichHtml } from '@/lib/sanitize'
import { formatEventDateTime } from '@/lib/utils'
import { RelatedApunteLinks, type RelatedApunteLink } from '@/components/events/RelatedApunteLinks'
import {
  ALL_COMMISSIONS_VALUE,
  filterEventsByPreferredCommission,
  normalizePreferredCommissionId,
  type CommissionOption,
  type CommissionAwareEvent,
  writePreferredCommissionId,
} from '@/lib/commission-preferences'
import { CommissionSelectField } from '@/components/commissions/CommissionSelectField'
import { usePreferredCommissionId } from '@/components/commissions/usePreferredCommission'

interface TipoEvento {
  id: string
  nombre: string
}

interface SubjectEventItem extends CommissionAwareEvent {
  id: string
  titulo: string
  fecha: string
  hora: string | null
  descripcionHtml: string | null
  tipoEvento: {
    nombre: string
  }
  tipoEventoId: string
  commissionSlug?: string | null
  commissionNombre?: string | null
  apuntes?: RelatedApunteLink[]
}

interface SubjectEventsSectionProps {
  subject: {
    id: string
    slug: string
    nombre: string
    year: {
      id: string
      slug: string
    }
  }
  agendaId: string
  tiposEvento: TipoEvento[]
  categoriasDisponibles: Array<{ id: string; nombre: string }>
  commissions: readonly CommissionOption[]
  activeCommission?: CommissionOption | null
  events: readonly SubjectEventItem[]
  chipClassName: string
}

export function SubjectEventsSection({
  subject,
  agendaId,
  tiposEvento,
  categoriasDisponibles,
  commissions,
  activeCommission,
  events,
  chipClassName,
}: SubjectEventsSectionProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventCalendarEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const preferredCommissionId = usePreferredCommissionId(
    subject.slug,
    commissions,
    Boolean(activeCommission),
  )

  const selectedCommission = useMemo(
    () =>
      commissions.find((commission) => commission.id === preferredCommissionId) ?? null,
    [commissions, preferredCommissionId],
  )

  const visibleEvents = useMemo(() => {
    if (activeCommission) {
      return [...events]
    }

    return filterEventsByPreferredCommission(events, preferredCommissionId)
  }, [activeCommission, events, preferredCommissionId])

  const description = activeCommission
    ? 'Acá ves las fechas generales de la materia y lo propio de esta comisión.'
    : selectedCommission
      ? `Acá ves las fechas generales de la materia y lo propio de ${selectedCommission.nombre}.`
      : 'Fechas, entregas y avisos importantes de la materia en un solo lugar.'

  return (
    <section id="calendario" className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Agenda
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {activeCommission
                ? `Fechas de ${activeCommission.nombre}`
                : selectedCommission
                  ? `Fechas de ${selectedCommission.nombre}`
                  : 'Calendario de eventos'}
            </h2>
            <AdminControls yearId={subject.year.id}>
              <AdminTriggerButton
                action="new-event"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-white/10 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-3 w-3" />
                Agregar nuevo evento
              </AdminTriggerButton>
            </AdminControls>
            {!activeCommission ? (
              <>
                <div className="hidden sm:block h-4 w-px bg-white/10" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-white/40">
                    Seleccionar comisión:
                  </span>
                  <CommissionSelectField
                    id="subject-preferred-commission"
                    value={preferredCommissionId ?? ALL_COMMISSIONS_VALUE}
                    commissions={commissions}
                    onChange={(value) => {
                      const nextCommissionId = normalizePreferredCommissionId(value)
                      writePreferredCommissionId(subject.slug, nextCommissionId)
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 items-start sm:items-end">
          <p className="text-sm text-white/48">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <EventCalendarAdmin
          events={visibleEvents.map((evento) => ({
            id: evento.id,
            titulo: evento.titulo,
            fecha: evento.fecha,
            hora: evento.hora,
            tipo: evento.tipoEvento.nombre,
            tipoId: evento.tipoEventoId,
            materiaNombre: subject.nombre,
            descripcionHtml: evento.descripcionHtml,
            tituloOriginal: evento.titulo,
            subjectSlug: subject.slug,
            subjectId: subject.id,
            commissionId: evento.commissionId,
            commissionSlug: evento.commissionSlug,
            commissionNombre: evento.commissionNombre,
            apuntes: evento.apuntes,
          }))}
          emptyMessage={
            activeCommission || selectedCommission
              ? 'Todavía no hay fechas cargadas para esta comisión.'
              : 'Sin eventos cargados para esta materia.'
          }
          agendaId={agendaId}
          subjectId={subject.id}
          subjectSlug={subject.slug}
          yearId={subject.year.id}
          yearSlug={subject.year.slug}
          commissionSlug={activeCommission?.slug}
          tiposEvento={tiposEvento}
          commissions={commissions}
          categoriasDisponibles={categoriasDisponibles}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
          sheetOpen={sheetOpen}
          setSheetOpen={setSheetOpen}
        />

        <div className="space-y-3">
          {visibleEvents.length === 0 ? (
            <DarkCard className="p-5 text-sm leading-6 text-white/58">
              {activeCommission || selectedCommission
                ? 'Todavía no hay fechas detalladas para esta comisión.'
                : 'Todavía no hay eventos detallados para esta materia.'}
            </DarkCard>
          ) : (
            visibleEvents.map((evento) => (
              <button
                key={evento.id}
                type="button"
                onClick={() => {
                  setSelectedEvent({
                    id: evento.id,
                    titulo: evento.titulo,
                    fecha: evento.fecha,
                    hora: evento.hora,
                    tipo: evento.tipoEvento.nombre,
                    tipoId: evento.tipoEventoId,
                    materiaNombre: subject.nombre,
                    descripcionHtml: evento.descripcionHtml,
                    tituloOriginal: evento.titulo,
                    subjectSlug: subject.slug,
                    subjectId: subject.id,
                    commissionId: evento.commissionId,
                    commissionSlug: evento.commissionSlug,
                    commissionNombre: evento.commissionNombre,
                    apuntes: evento.apuntes,
                  })
                  setSheetOpen(true)
                }}
                className="w-full text-left cursor-pointer group focus:outline-none block"
              >
                <DarkCard className="p-5 transition-colors group-hover:border-white/14 group-focus-visible:border-white/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
                          {evento.tipoEvento.nombre}
                        </p>
                        {evento.commissionNombre ? (
                          <span
                            className={`inline-flex border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${chipClassName}`}
                          >
                            {evento.commissionNombre}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-lg font-black tracking-tight text-white transition-colors group-hover:text-red-400">
                        {evento.titulo}
                      </h3>
                      <RelatedApunteLinks apuntes={evento.apuntes} className="mt-2" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${chipClassName}`}
                      >
                        {formatEventDateTime(evento.fecha, evento.hora)}
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DeleteEventoButton
                          eventoId={evento.id}
                          subjectSlug={subject.slug}
                          yearId={subject.year.id}
                        />
                      </div>
                    </div>
                  </div>

                  {evento.descripcionHtml ? (
                    <div
                      className="mt-4 space-y-2 text-sm leading-6 text-white/62 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white text-left"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichHtml(evento.descripcionHtml ?? ''),
                      }}
                    />
                  ) : null}
                </DarkCard>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
