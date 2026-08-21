'use client'

import { useEffect, useActionState, useMemo, useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { CollapsibleFormSection } from '@/components/ui/CollapsibleFormSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormError } from '@/components/ui/FormError'
import {
  createEventoAction,
  updateEventoAction,
  type EventoActionState,
} from '@/app/admin/actions/eventos'
import type { EventCalendarEvent } from '@/components/calendar/EventCalendar'
import {
  ALL_COMMISSIONS_VALUE,
  type CommissionOption,
} from '@/lib/commission-preferences'
import { CommissionSelectField } from '@/components/commissions/CommissionSelectField'
import { ApunteModal } from '@/components/admin/ApunteModal'
import type { RelatedApunteLink } from '@/components/events/RelatedApunteLinks'
import { detectEventType } from '@/lib/domain/eventos/eventType'

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

interface EventModalSharedProps {
  open: boolean
  onClose: () => void
  agendaId?: string
  subjectId?: string
  subjectSlug?: string
  tiposEvento: TipoEvento[]
  onSuccess?: () => void
  subjects?: readonly EventModalSubject[]
  commissions?: readonly CommissionOption[]
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
}

interface EventModalCreateProps extends EventModalSharedProps {
  /** Fecha precargada al abrir desde un clic en el calendario (ISO o string YYYY-MM-DDTHH:mm) */
  initialDate?: string
  eventToEdit?: undefined
}

interface EventModalEditProps extends EventModalSharedProps {
  initialDate?: undefined
  /** Evento a editar: el modal arranca en modo edición. */
  eventToEdit: EventCalendarEvent
}

type EventModalProps = EventModalCreateProps | EventModalEditProps

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

// Hook single-consumer, co-locado acá (era src/hooks/useApunteSearch.ts):
// busca apuntes por materia con debounce, para el buscador de "Apuntes relacionados".
function useApunteSearch({
  query,
  subjectId,
}: {
  query: string
  subjectId: string
}) {
  const [results, setResults] = useState<RelatedApunteLink[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!subjectId) {
      const handle = window.setTimeout(() => setResults([]), 0)
      return () => window.clearTimeout(handle)
    }

    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true)
        try {
          const params = new URLSearchParams({ subjectId })
          if (query.trim()) params.set('q', query.trim())
          const response = await fetch(`/api/admin/apuntes/search?${params.toString()}`, {
            signal: controller.signal,
          })
          if (!response.ok) {
            setResults([])
            return
          }
          const data = (await response.json()) as { items?: RelatedApunteLink[] }
          setResults(data.items ?? [])
        } catch (error) {
          if ((error as Error).name !== 'AbortError') setResults([])
        } finally {
          setSearching(false)
        }
      })()
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [query, subjectId])

  return { results, searching }
}

// Draft del evento: agrupa el estado que cambia SIEMPRE en bloque (reset al
// abrir/editar, cascada subject -> comisión + búsqueda de apuntes). Toggles de
// UI sin relación entre sí (newApunteOpen, apuntesOpen) quedan como useState.
interface EventDraftState {
  titulo: string
  selectedTipoId: string
  selectedSubjectId: string
  selectedCommissionId: string
  selectedApuntes: RelatedApunteLink[]
  apunteQuery: string
}

type EventDraftAction =
  | { type: 'SET_TITULO'; titulo: string }
  | { type: 'SET_TIPO'; tipoId: string }
  | { type: 'SUBJECT_CHANGED'; subjectId: string }
  | { type: 'SET_COMMISSION'; commissionId: string }
  | { type: 'SET_APUNTE_QUERY'; query: string }
  | { type: 'ADD_APUNTE'; apunte: RelatedApunteLink }
  | { type: 'ADD_APUNTE_IF_NEW'; apunte: RelatedApunteLink }
  | { type: 'REMOVE_APUNTE'; apunteId: string }
  | { type: 'FILTER_APUNTES_BY_SUBJECT_SLUG'; subjectSlug: string }

function eventDraftReducer(state: EventDraftState, action: EventDraftAction): EventDraftState {
  switch (action.type) {
    case 'SET_TITULO':
      return { ...state, titulo: action.titulo }
    case 'SET_TIPO':
      return { ...state, selectedTipoId: action.tipoId }
    case 'SUBJECT_CHANGED':
      return {
        ...state,
        selectedSubjectId: action.subjectId,
        selectedCommissionId: '',
        apunteQuery: '',
      }
    case 'SET_COMMISSION':
      return { ...state, selectedCommissionId: action.commissionId }
    case 'SET_APUNTE_QUERY':
      return { ...state, apunteQuery: action.query }
    case 'ADD_APUNTE':
      return { ...state, selectedApuntes: [...state.selectedApuntes, action.apunte] }
    case 'ADD_APUNTE_IF_NEW':
      return state.selectedApuntes.some((apunte) => apunte.id === action.apunte.id)
        ? state
        : { ...state, selectedApuntes: [...state.selectedApuntes, action.apunte] }
    case 'REMOVE_APUNTE':
      return {
        ...state,
        selectedApuntes: state.selectedApuntes.filter((apunte) => apunte.id !== action.apunteId),
      }
    case 'FILTER_APUNTES_BY_SUBJECT_SLUG':
      if (!action.subjectSlug) return state
      return {
        ...state,
        selectedApuntes: state.selectedApuntes.filter(
          (apunte) => apunte.subject.slug === action.subjectSlug,
        ),
      }
    default:
      return state
  }
}

function initEventDraft(eventToEdit: EventCalendarEvent | undefined): EventDraftState {
  return {
    titulo: eventToEdit
      ? (eventToEdit.tituloOriginal ?? eventToEdit.title ?? eventToEdit.titulo ?? '')
      : '',
    selectedTipoId: eventToEdit?.tipoId ?? '',
    selectedSubjectId: eventToEdit?.subjectId ?? '',
    selectedCommissionId: eventToEdit?.commissionId ?? '',
    selectedApuntes: eventToEdit?.apuntes ?? [],
    apunteQuery: '',
  }
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
  const [draft, dispatch] = useReducer(eventDraftReducer, eventToEdit, initEventDraft)
  const [newApunteOpen, setNewApunteOpen] = useState(false)
  const [apuntesOpen, setApuntesOpen] = useState(
    () => (eventToEdit?.apuntes && eventToEdit.apuntes.length > 0) ?? false
  )

  // Determine current active agendaId and subjectSlug
  const isYearMode = subjects && subjects.length > 0
  const currentSubject = isYearMode
    ? subjects.find((s) => s.id === draft.selectedSubjectId)
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
    (commission) => commission.id === draft.selectedCommissionId,
  )
    ? draft.selectedCommissionId
    : ''
  const { results: apunteResults, searching: searchingApuntes } = useApunteSearch({
    query: draft.apunteQuery,
    subjectId: activeSubjectId,
  })

  useEffect(() => {
    const handle = window.setTimeout(() => {
      dispatch({ type: 'FILTER_APUNTES_BY_SUBJECT_SLUG', subjectSlug: activeSubjectSlug })
    }, 0)
    return () => window.clearTimeout(handle)
  }, [activeSubjectSlug])


  const inferTypeFromTitle = () => {
    const matchedId = detectEventType(draft.titulo, tiposEvento)
    if (matchedId) dispatch({ type: 'SET_TIPO', tipoId: matchedId })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const matchedId = detectEventType(draft.titulo, tiposEvento)
    if (matchedId) {
      dispatch({ type: 'SET_TIPO', tipoId: matchedId })
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
            selectedSubjectId={draft.selectedSubjectId}
            onChange={(nextSubjectId) => dispatch({ type: 'SUBJECT_CHANGED', subjectId: nextSubjectId })}
          />
        ) : null}

        {(isYearMode ? draft.selectedSubjectId !== '' : true) && (
          <CommissionSelectField
            id="evento-comision"
            label="Comisión"
            value={activeCommissionId || ALL_COMMISSIONS_VALUE}
            commissions={availableCommissions}
            onChange={(value) =>
              dispatch({
                type: 'SET_COMMISSION',
                commissionId: value === ALL_COMMISSIONS_VALUE ? '' : value,
              })
            }
            helperText="Si la dejás en Todas las comisiones, la fecha queda disponible para toda la materia."
          />
        )}

        <EventTitleField
          value={draft.titulo}
          onBlur={inferTypeFromTitle}
          onChange={(titulo) => dispatch({ type: 'SET_TITULO', titulo })}
        />

        <EventRelatedApuntesSection
          activeCategorias={activeCategorias}
          activeSubjectId={activeSubjectId}
          apunteQuery={draft.apunteQuery}
          apunteResults={apunteResults}
          open={apuntesOpen}
          searchingApuntes={searchingApuntes}
          selectedApuntes={draft.selectedApuntes}
          onAddApunte={(apunte) => dispatch({ type: 'ADD_APUNTE', apunte })}
          onCreateApunte={() => setNewApunteOpen(true)}
          onQueryChange={(query) => dispatch({ type: 'SET_APUNTE_QUERY', query })}
          onRemoveApunte={(apunteId) => dispatch({ type: 'REMOVE_APUNTE', apunteId })}
          onToggle={() => setApuntesOpen(!apuntesOpen)}
        />

        <EventTypeSelect
          tiposEvento={tiposEvento}
          value={draft.selectedTipoId}
          onChange={(tipoId) => dispatch({ type: 'SET_TIPO', tipoId })}
        />

        <EventDateTimeFields eventToEdit={eventToEdit} initialDate={initialDate} />

        <EventDescriptionField defaultValue={(eventToEdit as { descripcion?: string | null } | undefined)?.descripcion ?? eventToEdit?.descripcionHtml ?? ''} />

        <FormError message={!state.ok ? state.message : ''} />

        <EventFormActions editing={Boolean(eventToEdit)} pending={pending} onClose={onClose} />
      </form>
      {activeSubjectId ? (
        <ApunteModal
          open={newApunteOpen}
          onClose={() => setNewApunteOpen(false)}
          subjectId={activeSubjectId}
          categoriasDisponibles={activeCategorias}
          onCreated={(apunte) => dispatch({ type: 'ADD_APUNTE_IF_NEW', apunte })}
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
      <Label htmlFor="evento-subject">Materia</Label>
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
      <Label htmlFor="evento-titulo">Título</Label>
      <Input
        id="evento-titulo"
        type="text"
        name="titulo"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder="Ej: Parcial de Estructuras"
        className="focus:border-white/30 focus:ring-1 focus:ring-white/10"
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
            <Input
              type="search"
              value={apunteQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              aria-label="Buscar apunte por título"
              placeholder="Buscar apunte por título"
              className="focus:border-white/30 focus:ring-1 focus:ring-white/10"
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
      <Label htmlFor="evento-tipo">Tipo</Label>
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
        <Label htmlFor="evento-fecha">Fecha</Label>
        <Input
          id="evento-fecha"
          type="date"
          name="fecha"
          required
          defaultValue={eventToEdit ? toDateInputValue(eventToEdit.fecha ?? eventToEdit.start ?? eventToEdit.date) : toDateInputValue(initialDate)}
          className="cursor-pointer focus:border-white/30 focus:ring-1 focus:ring-white/10"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="evento-hora">
          Hora <span className="font-normal normal-case tracking-normal text-white/30">(opcional)</span>
        </Label>
        <Input
          id="evento-hora"
          type="time"
          name="hora"
          defaultValue={eventToEdit?.hora ?? ''}
          className="cursor-pointer focus:border-white/30 focus:ring-1 focus:ring-white/10"
        />
      </div>
    </div>
  )
}

function EventDescriptionField({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor="evento-descripcion">
        Descripción <span className="font-normal normal-case tracking-normal text-white/30">(opcional)</span>
      </Label>
      <Textarea
        id="evento-descripcion"
        name="descripcion"
        rows={3}
        defaultValue={defaultValue}
        placeholder="Detalles del evento"
        className="focus:border-white/30 focus:ring-1 focus:ring-white/10"
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
      <Button type="button" variant="ghost" onClick={onClose}>
        Cancelar
      </Button>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear evento'}
      </Button>
    </div>
  )
}
