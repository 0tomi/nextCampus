'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { EventModal } from '@/components/admin/EventModal'
import { AdminControls } from '@/components/admin/AdminControls'
import { Sheet } from '@/components/ui/Sheet'
import { deleteEvento } from '@/app/admin/actions'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { getEventTone } from '@/components/mobile/shared/tokens'
import { cn, formatDateTime } from '@/lib/utils'
import type { CommissionOption } from '@/lib/commission-preferences'
import type { MobileCalendarEvent } from './MobileCalendar'

interface TipoEvento {
  id: string
  nombre: string
}

interface EventModalSubject {
  id: string
  slug: string
  nombre: string
  agendaId: string
  commissions: readonly CommissionOption[]
}

interface MobileEventDetailSheetProps {
  event: MobileCalendarEvent | null
  open: boolean
  onClose: () => void
  yearId?: string
  yearSlug?: string
  subjectSlug?: string
  agendaId?: string
  tiposEvento?: readonly TipoEvento[]
  subjects?: readonly EventModalSubject[]
  commissions?: readonly CommissionOption[]
}

export function MobileEventDetailSheet({
  event,
  open,
  onClose,
  yearId,
  yearSlug,
  subjectSlug,
  agendaId = '',
  tiposEvento = [],
  subjects,
  commissions,
}: MobileEventDetailSheetProps) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const effectiveYearId = event?.yearId ?? yearId
  const effectiveYearSlug = event?.yearSlug ?? yearSlug
  const effectiveSubjectSlug = event?.subjectSlug ?? subjectSlug
  const canShowAdminActions = Boolean(event?.id && effectiveYearId && tiposEvento.length > 0)
  const tone = event ? getEventTone(event.tipo) : null

  const subjectHref = event?.subjectSlug && effectiveYearSlug
    ? buildSubjectHref({
        yearSlug: effectiveYearSlug,
        subjectSlug: event.subjectSlug,
        commissionSlug: event.commissionSlug ?? undefined,
      })
    : null

  const handleDelete = () => {
    if (!event?.id) return
    const confirmed = window.confirm('¿Eliminar este evento?')
    if (!confirmed) return

    startDeleteTransition(async () => {
      const formData = new FormData()
      formData.append('id', event.id)
      await deleteEvento(formData)
      onClose()
      router.refresh()
    })
  }

  return (
    <>
      <Sheet
        open={open && Boolean(event)}
        onClose={onClose}
        title="Detalles del evento"
        className="max-w-full rounded-t-2xl border-l-0 border-t border-white/8 sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0"
      >
        {event ? (
          <div className="space-y-6 pb-3">
            <div className="space-y-3">
              {tone ? (
                <span
                  className="inline-flex rounded border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ background: tone.bg, borderColor: tone.border, color: tone.text }}
                >
                  {event.tipo}
                </span>
              ) : null}
              <h3 className="font-display text-2xl font-black leading-tight tracking-tight text-white">
                {event.tituloOriginal ?? event.titulo}
              </h3>
            </div>

            <div className="grid gap-3 border-y border-white/6 py-4">
              <DetailRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Fecha"
                value={formatDateTime(event.fecha)}
              />
              <DetailRow
                icon={<Clock className="h-4 w-4" />}
                label="Horario"
                value={new Date(event.fecha).toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
              {event.materiaNombre ? (
                <DetailRow
                  label="Materia"
                  value={event.materiaNombre}
                  href={subjectHref ?? undefined}
                />
              ) : null}
              {event.commissionNombre ? (
                <DetailRow label="Comisión" value={event.commissionNombre} />
              ) : null}
            </div>

            {event.descripcionHtml ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/36">
                  Descripción
                </p>
                <div
                  className="rounded-xl border border-white/6 bg-white/[0.025] px-4 py-3 text-sm leading-7 text-white/68 [&_a]:cursor-pointer [&_a]:text-red-300 [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                  dangerouslySetInnerHTML={{ __html: event.descripcionHtml }}
                />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white/42">
                Sin descripción por ahora.
              </p>
            )}

            {canShowAdminActions ? (
              <AdminControls yearId={effectiveYearId} noWrapper>
                <div className="grid grid-cols-2 gap-2 border-t border-white/6 pt-5">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface-1 text-sm font-bold text-white/72 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 text-sm font-bold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Borrando...' : 'Eliminar'}
                  </button>
                </div>
              </AdminControls>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      {event && canShowAdminActions ? (
        <EventModal
          key={`mobile-edit-${event.id}`}
          open={isEditOpen}
          onClose={() => {
            setIsEditOpen(false)
            onClose()
          }}
          agendaId={agendaId}
          subjectSlug={effectiveSubjectSlug ?? ''}
          tiposEvento={[...tiposEvento]}
          subjects={subjects}
          commissions={commissions}
          eventToEdit={{
            id: event.id,
            titulo: event.titulo,
            title: event.titulo,
            tituloOriginal: event.tituloOriginal ?? event.titulo,
            fecha: event.fecha,
            tipo: event.tipo,
            tipoId: event.tipoId,
            subjectId: event.subjectId,
            subjectSlug: event.subjectSlug ?? effectiveSubjectSlug,
            materiaNombre: event.materiaNombre,
            descripcionHtml: event.descripcionHtml,
            commissionId: event.commissionId,
            commissionSlug: event.commissionSlug,
            commissionNombre: event.commissionNombre,
          }}
        />
      ) : null}
    </>
  )
}

function DetailRow({
  icon,
  label,
  value,
  href,
}: {
  icon?: ReactNode
  label: string
  value: string
  href?: string
}) {
  const content = (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 text-sm font-bold text-white/82',
        href && 'transition-colors hover:text-red-300',
      )}
    >
      <span className="truncate">{value}</span>
      {href ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/35" /> : null}
    </span>
  )

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.025] px-3 py-2.5">
      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/36">
        {icon ? <span className="text-white/32">{icon}</span> : null}
        {label}
      </span>
      {href ? (
        <Link href={href} className="min-w-0 cursor-pointer">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  )
}
