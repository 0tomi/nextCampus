'use client'

import { useEffect, useActionState, useState } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import {
  createEventoAction,
  updateEventoAction,
  type EventoActionState,
} from '@/app/admin/actions'
import type { EventCalendarEvent } from '@/components/calendar/EventCalendar'

interface TipoEvento {
  id: string
  nombre: string
}

interface EventModalSubject {
  id: string
  slug: string
  nombre: string
  agendaId: string
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
  subjects?: EventModalSubject[]
  /** Evento a editar si estamos en modo edición */
  eventToEdit?: EventCalendarEvent
}

const emptyState: EventoActionState = { ok: false, message: '' }

function formatForDatetimeLocal(dateInput?: string | Date): string {
  if (!dateInput) return ''
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
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

  // Determine current active agendaId and subjectSlug
  const isYearMode = subjects && subjects.length > 0
  const currentSubject = isYearMode
    ? subjects.find((s) => s.id === selectedSubjectId)
    : null

  const activeAgendaId = isYearMode ? (currentSubject?.agendaId ?? '') : agendaId
  const activeSubjectSlug = isYearMode ? (currentSubject?.slug ?? '') : subjectSlug

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
              onChange={(e) => setSelectedSubjectId(e.target.value)}
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
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
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

        <div className="space-y-1">
          <label
            htmlFor="evento-fecha"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Fecha
          </label>
          <input
            id="evento-fecha"
            type="datetime-local"
            name="fecha"
            required
            defaultValue={
              eventToEdit
                ? formatForDatetimeLocal(eventToEdit.fecha ?? eventToEdit.start ?? eventToEdit.date)
                : (initialDate ?? '')
            }
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
          />
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
