'use client'

import { useEffect, useActionState, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { CollapsibleFormSection } from '@/components/ui/CollapsibleFormSection'
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
import { ApunteModal } from '@/components/admin/ApunteModal'
import type { RelatedApunteLink } from '@/components/events/RelatedApunteLinks'
import { detectEventType } from '@/lib/domain/eventos/eventType'
import { useApunteSearch } from '@/hooks/useApunteSearch'

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
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
}

interface EventModalProps {
  open: boolean
  onClose: () => void
  agendaId?: string
  subjectId?: string
  subjectSlug?: string
  tiposEvento: TipoEvento[]
  /** Fecha precargada al abrir desde un clic en el calendario (ISO o string YYYY-MM-DDTHH:mm) */
  initialDate?: string
  onSuccess?: () => void
  subjects?: readonly EventModalSubject[]
  commissions?: readonly CommissionOption[]
  /** Evento a editar si estamos en modo edición */
  eventToEdit?: EventCalendarEvent
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
}

const emptyState: EventoActionState = { ok: false, message: '' }
const EMPTY_CATEGORIAS_DISPONIBLES: Array<{ id: string; nombre: string }> = []

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
  subjectId = '',
  subjectSlug = '',
  tiposEvento,
  initialDate,
  onSuccess,
  subjects,
  commissions,
  eventToEdit,
  categoriasDisponibles = EMPTY_CATEGORIAS_DISPONIBLES,
}: EventModalProps) {
  const router = useRouter()
  const actionToUse = eventToEdit ? updateEventoAction : createEventoAction
  const submitEvent = async (
    previousState: EventoActionState,
    formData: FormData,
  ) => {
    const nextState = await actionToUse(previousState, formData)

    if (nextState.ok) {
      toast.success(eventToEdit ? 'Evento actualizado' : 'Evento creado')
      router.refresh()
      onSuccess?.()
      onClose()
    } else if (nextState.message) {
      toast.error(nextState.message)
    }

    return nextState
  }
  const [state, formAction, pending] = useActionState(submitEvent, emptyState)
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
  const [selectedApuntes, setSelectedApuntes] = useState<RelatedApunteLink[]>(
    () => eventToEdit?.apuntes ?? [],
  )
  const [apunteQuery, setApunteQuery] = useState('')
  const [newApunteOpen, setNewApunteOpen] = useState(false)
  const [apuntesOpen, setApuntesOpen] = useState(
    () => (eventToEdit?.apuntes && eventToEdit.apuntes.length > 0) ?? false
  )

  // Determine current active agendaId and subjectSlug
  const isYearMode = subjects && subjects.length > 0
  const currentSubject = isYearMode
    ? subjects.find((s) => s.id === selectedSubjectId)
    : null

  const activeAgendaId = isYearMode ? (currentSubject?.agendaId ?? '') : agendaId
  const activeSubjectSlug = isYearMode ? (currentSubject?.slug ?? '') : subjectSlug
  const activeSubjectId = isYearMode ? (currentSubject?.id ?? '') : (eventToEdit?.subjectId ?? subjectId)
  const activeCategorias = isYearMode
    ? (currentSubject?.categoriasDisponibles ?? [])
    : categoriasDisponibles
  const availableCommissions = useMemo(
    () => (isYearMode ? (currentSubject?.commissions ?? []) : (commissions ?? [])),
    [commissions, currentSubject?.commissions, isYearMode],
  )
  const activeCommissionId = availableCommissions.some(
    (commission) => commission.id === selectedCommissionId,
  )
    ? selectedCommissionId
    : ''
  const { results: apunteResults, searching: searchingApuntes } = useApunteSearch({
    query: apunteQuery,
    subjectId: activeSubjectId,
  })

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSelectedApuntes((prev) => {
        if (!activeSubjectSlug) return prev
        return prev.filter((apunte) => apunte.subject.slug === activeSubjectSlug)
      })
    }, 0)
    return () => window.clearTimeout(handle)
  }, [activeSubjectSlug])


  const inferTypeFromTitle = () => {
    const matchedId = detectEventType(titulo, tiposEvento)
    if (matchedId) setSelectedTipoId(matchedId)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const matchedId = detectEventType(titulo, tiposEvento)
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

        {isYearMode && subjects ? (
          <EventSubjectSelect
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onChange={(nextSubjectId) => {
              setSelectedSubjectId(nextSubjectId)
              setSelectedCommissionId('')
              setApunteQuery('')
            }}
          />
        ) : null}

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

        <EventTitleField value={titulo} onBlur={inferTypeFromTitle} onChange={setTitulo} />

        <EventRelatedApuntesSection
          activeCategorias={activeCategorias}
          activeSubjectId={activeSubjectId}
          apunteQuery={apunteQuery}
          apunteResults={apunteResults}
          open={apuntesOpen}
          searchingApuntes={searchingApuntes}
          selectedApuntes={selectedApuntes}
          onAddApunte={(apunte) => setSelectedApuntes((prev) => [...prev, apunte])}
          onCreateApunte={() => setNewApunteOpen(true)}
          onQueryChange={setApunteQuery}
          onRemoveApunte={(apunteId) => setSelectedApuntes((prev) => prev.filter((item) => item.id !== apunteId))}
          onToggle={() => setApuntesOpen(!apuntesOpen)}
        />

        <EventTypeSelect tiposEvento={tiposEvento} value={selectedTipoId} onChange={setSelectedTipoId} />

        <EventDateTimeFields eventToEdit={eventToEdit} initialDate={initialDate} />

        <EventDescriptionField defaultValue={eventToEdit?.descripcionHtml ?? ''} />

        {state.message && !state.ok && (
          <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {state.message}
          </p>
        )}

        <EventFormActions editing={Boolean(eventToEdit)} pending={pending} onClose={onClose} />
      </form>
      {activeSubjectId ? (
        <ApunteModal
          open={newApunteOpen}
          onClose={() => setNewApunteOpen(false)}
          subjectId={activeSubjectId}
          categoriasDisponibles={activeCategorias}
          onCreated={(apunte) => {
            setSelectedApuntes((prev) =>
              prev.some((item) => item.id === apunte.id) ? prev : [...prev, apunte],
            )
          }}
        />
      ) : null}
    </Modal>
  )
}

function EventSubjectSelect({
  subjects,
  selectedSubjectId,
  onChange,
}: {
  subjects: readonly EventModalSubject[]
  selectedSubjectId: string
  onChange: (subjectId: string) => void
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="evento-subject" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
        Materia
      </label>
      <select
        id="evento-subject"
        required
        value={selectedSubjectId}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none cursor-pointer"
      >
        <option value="" disabled>
          Seleccioná una materia
        </option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}

function EventTitleField({
  value,
  onBlur,
  onChange,
}: {
  value: string
  onBlur: () => void
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="evento-titulo" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
        Título
      </label>
      <input
        id="evento-titulo"
        type="text"
        name="titulo"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder="Ej: Parcial de Estructuras"
        className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
      />
    </div>
  )
}

function EventRelatedApuntesSection({
  activeCategorias,
  activeSubjectId,
  apunteQuery,
  apunteResults,
  open,
  searchingApuntes,
  selectedApuntes,
  onAddApunte,
  onCreateApunte,
  onQueryChange,
  onRemoveApunte,
  onToggle,
}: {
  activeCategorias: Array<{ id: string; nombre: string }>
  activeSubjectId: string
  apunteQuery: string
  apunteResults: RelatedApunteLink[]
  open: boolean
  searchingApuntes: boolean
  selectedApuntes: RelatedApunteLink[]
  onAddApunte: (apunte: RelatedApunteLink) => void
  onCreateApunte: () => void
  onQueryChange: (query: string) => void
  onRemoveApunte: (apunteId: string) => void
  onToggle: () => void
}) {
  return (
    <CollapsibleFormSection
      title="Apuntes relacionados"
      hint="Sumá material de estudio para que la fecha quede acompañada."
      open={open}
      onToggle={onToggle}
    >
      <input type="hidden" name="apunteIdsJson" value={JSON.stringify(selectedApuntes.map((apunte) => apunte.id))} />

      <div className="space-y-3 pt-1">
        {activeSubjectId ? (
          <>
            <input
              type="search"
              value={apunteQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              aria-label="Buscar apunte por título"
              placeholder="Buscar apunte por título"
              className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
            />
            <SelectedApuntePills selectedApuntes={selectedApuntes} onRemoveApunte={onRemoveApunte} />
            <ApunteSearchResults
              apunteQuery={apunteQuery}
              apunteResults={apunteResults}
              searchingApuntes={searchingApuntes}
              selectedApuntes={selectedApuntes}
              onAddApunte={onAddApunte}
            />
            <button
              type="button"
              disabled={activeCategorias.length === 0}
              onClick={onCreateApunte}
              className="inline-flex cursor-pointer items-center justify-center rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/70 transition-colors hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Crear y asociar apunte
            </button>
          </>
        ) : (
          <p className="rounded border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/42">
            Elegí una materia para buscar o crear apuntes.
          </p>
        )}
      </div>
    </CollapsibleFormSection>
  )
}

function SelectedApuntePills({
  selectedApuntes,
  onRemoveApunte,
}: {
  selectedApuntes: RelatedApunteLink[]
  onRemoveApunte: (apunteId: string) => void
}) {
  if (selectedApuntes.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {selectedApuntes.map((apunte) => (
        <button
          key={apunte.id}
          type="button"
          onClick={() => onRemoveApunte(apunte.id)}
          className="cursor-pointer rounded-full border border-cyan-300/30 bg-cyan-300/12 px-3 py-1.5 text-xs font-bold text-cyan-100 transition-colors hover:bg-cyan-300/18"
        >
          {apunte.titulo}
        </button>
      ))}
    </div>
  )
}

function ApunteSearchResults({
  apunteQuery,
  apunteResults,
  searchingApuntes,
  selectedApuntes,
  onAddApunte,
}: {
  apunteQuery: string
  apunteResults: RelatedApunteLink[]
  searchingApuntes: boolean
  selectedApuntes: RelatedApunteLink[]
  onAddApunte: (apunte: RelatedApunteLink) => void
}) {
  const visibleResults = apunteResults.filter((apunte) => !selectedApuntes.some((selected) => selected.id === apunte.id))

  return (
    <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
      {searchingApuntes ? (
        <p className="rounded border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/45">Buscando apuntes…</p>
      ) : visibleResults.length > 0 ? (
        visibleResults.map((apunte) => (
          <button
            key={apunte.id}
            type="button"
            onClick={() => onAddApunte(apunte)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded border border-white/8 bg-surface-0 px-3 py-2 text-left text-xs font-semibold text-white/70 transition-colors hover:border-white/14 hover:bg-white/[0.04] hover:text-white"
          >
            <span className="truncate">{apunte.titulo}</span>
            <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/35">Asociar</span>
          </button>
        ))
      ) : apunteQuery.trim() ? (
        <p className="rounded border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/42">
          No encontramos apuntes con esa búsqueda.
        </p>
      ) : null}
    </div>
  )
}

function EventTypeSelect({
  tiposEvento,
  value,
  onChange,
}: {
  tiposEvento: TipoEvento[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="evento-tipo" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
        Tipo
      </label>
      <select
        id="evento-tipo"
        name="tipoEventoId"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full cursor-pointer rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
      >
        <option value="" disabled>
          Seleccioná un tipo
        </option>
        {tiposEvento.map((tipo) => (
          <option key={tipo.id} value={tipo.id}>
            {tipo.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}

function EventDateTimeFields({
  eventToEdit,
  initialDate,
}: {
  eventToEdit?: EventCalendarEvent
  initialDate?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor="evento-fecha" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
          Fecha
        </label>
        <input
          id="evento-fecha"
          type="date"
          name="fecha"
          required
          defaultValue={eventToEdit ? toDateInputValue(eventToEdit.fecha ?? eventToEdit.start ?? eventToEdit.date) : toDateInputValue(initialDate)}
          className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none cursor-pointer"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="evento-hora" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
          Hora <span className="font-normal normal-case tracking-normal text-white/30">(opcional)</span>
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
  )
}

function EventDescriptionField({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor="evento-descripcion" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
        Descripción <span className="font-normal normal-case tracking-normal text-white/30">(opcional)</span>
      </label>
      <textarea
        id="evento-descripcion"
        name="descripcionHtml"
        rows={3}
        defaultValue={defaultValue}
        placeholder="Detalles del evento"
        className="w-full resize-none rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
      />
    </div>
  )
}

function EventFormActions({
  editing,
  pending,
  onClose,
}: {
  editing: boolean
  pending: boolean
  onClose: () => void
}) {
  return (
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
        {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear evento'}
      </button>
    </div>
  )
}
