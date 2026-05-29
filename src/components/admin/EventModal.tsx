'use client'

import { useEffect, useActionState, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import {
  createEventoAction,
  updateEventoAction,
  type EventoActionState,
} from '@/app/admin/actions'
import type { EventCalendarEvent } from '@/components/calendar/EventCalendar'
import {
  ALL_COMMISSIONS_VALUE,
  type CommissionOption,
} from '@/lib/commission-preferences'
import { CommissionSelectField } from '@/components/commissions/CommissionSelectField'

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

interface EventModalProps {
  open: boolean
  onClose: () => void
  agendaId?: string
  subjectSlug?: string
  tiposEvento: TipoEvento[]
  /** Fecha precargada al abrir desde un clic en el calendario (ISO o string YYYY-MM-DDTHH:mm) */
  initialDate?: string
  onSuccess?: () => void
  subjects?: readonly EventModalSubject[]
  commissions?: readonly CommissionOption[]
  /** Evento a editar si estamos en modo edición */
  eventToEdit?: EventCalendarEvent
}

const emptyState: EventoActionState = { ok: false, message: '' }

// Extrae la clave de día "YYYY-MM-DD" para el input type="date". La fecha de un
// evento ya viaja como string "YYYY-MM-DD"; si llegara un Date, tomamos su día
// en UTC (así se guardó: medianoche UTC) para no correrlo un día.
function toDateInputValue(dateInput?: string | Date | null): string {
  if (!dateInput) return ''
  if (typeof dateInput === 'string') return dateInput.slice(0, 10)
  return isNaN(dateInput.getTime()) ? '' : dateInput.toISOString().slice(0, 10)
}

export function EventModal({
  open,
  ...props
}: EventModalProps) {
  if (!open) return null
  return <EventModalContent open={open} {...props} />
}

function EventModalContent({
  open,
  onClose,
  agendaId = '',
  subjectSlug = '',
  tiposEvento,
  initialDate,
  onSuccess,
  subjects,
  commissions,
  eventToEdit,
}: EventModalProps) {
  const router = useRouter()
  const actionToUse = eventToEdit ? updateEventoAction : createEventoAction
  const [state, formAction, pending] = useActionState(actionToUse, emptyState)
  const [titulo, setTitulo] = useState(
    eventToEdit ? (eventToEdit.tituloOriginal ?? eventToEdit.title ?? eventToEdit.titulo ?? '') : ''
  )
  const [selectedTipoId, setSelectedTipoId] = useState(
    eventToEdit?.tipoId ?? ''
  )
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    eventToEdit?.subjectId ?? ''
  )
  const [selectedCommissionId, setSelectedCommissionId] = useState(
    eventToEdit?.commissionId ?? ''
  )

  // Determine current active agendaId and subjectSlug
  const isYearMode = subjects && subjects.length > 0
  const currentSubject = isYearMode
    ? subjects.find((s) => s.id === selectedSubjectId)
    : null

  const activeAgendaId = isYearMode ? (currentSubject?.agendaId ?? '') : agendaId
  const activeSubjectSlug = isYearMode ? (currentSubject?.slug ?? '') : subjectSlug
  const availableCommissions = useMemo(
    () => (isYearMode ? (currentSubject?.commissions ?? []) : (commissions ?? [])),
    [commissions, currentSubject?.commissions, isYearMode],
  )
  const activeCommissionId = availableCommissions.some(
    (commission) => commission.id === selectedCommissionId,
  )
    ? selectedCommissionId
    : ''

  useEffect(() => {
    if (state.ok) {
      router.refresh()
      onSuccess?.()
      onClose()
    }
  }, [state.ok, onClose, onSuccess, router])


  const detectEventType = (text: string): string | null => {
    if (!text.trim()) return null

    const normalize = (str: string) =>
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const normalizedText = normalize(text)

    const patterns = [
      {
        keyword: 'examen',
        regex: /exam|parc|fin|evalu|quiz|test|recup/i,
      },
      {
        keyword: 'exposicion',
        regex: /expo|presen|coloq|defen/i,
      },
      {
        keyword: 'trabajo practico',
        regex: /\btp\b|trab|prac|entre/i,
      },
    ]

    const match = patterns.find((p) => p.regex.test(normalizedText))
    if (!match) return null

    const matchedTipo = tiposEvento.find((t) => {
      const normalizedName = normalize(t.nombre)
      return normalizedName.includes(match.keyword) || match.keyword.includes(normalizedName)
    })

    return matchedTipo ? matchedTipo.id : null
  }

  const handleBlur = () => {
    const matchedId = detectEventType(titulo)
    if (matchedId) {
      flushSync(() => {
        setSelectedTipoId(matchedId)
      })
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const matchedId = detectEventType(titulo)
    if (matchedId) {
      setSelectedTipoId(matchedId)
      const selectEl = e.currentTarget.querySelector('select[name="tipoEventoId"]') as HTMLSelectElement | null
      if (selectEl) {
        selectEl.value = matchedId
      }
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={eventToEdit ? 'Editar evento' : 'Nuevo evento'}>
      <form onSubmit={handleSubmit} action={formAction} className="space-y-4">
        {eventToEdit && <input type="hidden" name="id" value={eventToEdit.id} />}
        <input type="hidden" name="agendaId" value={activeAgendaId} />
        <input type="hidden" name="subjectSlug" value={activeSubjectSlug} />
        <input type="hidden" name="commissionId" value={activeCommissionId} />

        {isYearMode && (
          <div className="space-y-1">
            <label
              htmlFor="evento-subject"
              className="block text-xs font-semibold uppercase tracking-widest text-white/40"
            >
              Materia
            </label>
            <select
              id="evento-subject"
              required
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value)
                setSelectedCommissionId('')
              }}
              className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>
                Seleccioná una materia
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {(isYearMode ? selectedSubjectId !== '' : true) && (
          <CommissionSelectField
            id="evento-comision"
            label="Comisión"
            value={activeCommissionId || ALL_COMMISSIONS_VALUE}
            commissions={availableCommissions}
            onChange={(value) =>
              setSelectedCommissionId(
                value === ALL_COMMISSIONS_VALUE ? '' : value,
              )
            }
            helperText="Si la dejás en Todas las comisiones, la fecha queda disponible para toda la materia."
          />
        )}

        <div className="space-y-1">
          <label
            htmlFor="evento-titulo"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Título
          </label>
          <input
            id="evento-titulo"
            type="text"
            name="titulo"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={handleBlur}
            placeholder="Ej: Parcial de Estructuras"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="evento-tipo"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Tipo
          </label>
          <select
            id="evento-tipo"
            name="tipoEventoId"
            required
            value={selectedTipoId}
            onChange={(e) => setSelectedTipoId(e.target.value)}
            className="w-full cursor-pointer rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
          >
            <option value="" disabled>
              Seleccioná un tipo
            </option>
            {tiposEvento.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="evento-fecha"
              className="block text-xs font-semibold uppercase tracking-widest text-white/40"
            >
              Fecha
            </label>
            <input
              id="evento-fecha"
              type="date"
              name="fecha"
              required
              defaultValue={
                eventToEdit
                  ? toDateInputValue(eventToEdit.fecha ?? eventToEdit.start ?? eventToEdit.date)
                  : toDateInputValue(initialDate)
              }
              className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="evento-hora"
              className="block text-xs font-semibold uppercase tracking-widest text-white/40"
            >
              Hora{' '}
              <span className="font-normal normal-case tracking-normal text-white/30">
                (opcional)
              </span>
            </label>
            <input
              id="evento-hora"
              type="time"
              name="hora"
              defaultValue={eventToEdit?.hora ?? ''}
              className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="evento-descripcion"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Descripción{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <textarea
            id="evento-descripcion"
            name="descripcionHtml"
            rows={3}
            defaultValue={eventToEdit?.descripcionHtml ?? ''}
            placeholder="Detalles del evento"
            className="w-full resize-none rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
          />
        </div>

        {state.message && !state.ok && (
          <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {state.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {pending ? 'Guardando…' : eventToEdit ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
