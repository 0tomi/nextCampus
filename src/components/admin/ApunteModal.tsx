'use client'

import { useActionState, useState, useCallback, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { CollapsibleFormSection } from '@/components/ui/CollapsibleFormSection'
import { Plus } from 'lucide-react'
import {
  createApunteAction,
  updateApunteAction,
  type ApunteActionState,
} from '@/app/admin/actions'
import { RichTextEditor } from './RichTextEditor'
import { RecursoRow } from '@/components/admin/apunte/RecursoRow'
import { useAutoApunteCategories } from '@/hooks/useAutoApunteCategories'
import { useApunteRecursos } from '@/hooks/useApunteRecursos'
import {
  getApunteFormValidationError,
  serializeRecursos,
  type RecursoDraft,
  type RecursoDraftKind,
} from '@/lib/domain/apuntes/apunteForm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApunteFull = {
  id: string
  titulo: string
  descripcionHtml: string
  /** Link compartible del apunte. Opcional para no romper callsites que aún no lo proveen. */
  slug?: string | null
  categorias?: Array<{ id: string; nombre: string }>
  recursos: Array<{
    id: string
    tipo: 'YOUTUBE' | 'DRIVE' | 'HTML' | 'REPOSITORY' | 'OTHER'
    url: string
    orden: number
    /** Nombre custom del recurso (fallback genérico cuando es null). */
    nombre?: string | null
    storageKey?: string | null
    mimeType?: string | null
    sizeBytes?: number | null
  }>
}

interface ApunteModalProps {
  open: boolean
  onClose: () => void
  subjectId: string
  apunte?: ApunteFull
  categoriasDisponibles: Array<{ id: string; nombre: string }>
  onSuccess?: () => void
  onCreated?: (apunte: NonNullable<ApunteActionState['apunte']>) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyState: ApunteActionState = { ok: false, message: '' }

// ---------------------------------------------------------------------------
// ApunteModal
// ---------------------------------------------------------------------------

export function ApunteModal({
  open,
  onClose,
  subjectId,
  apunte,
  categoriasDisponibles,
  onSuccess,
  onCreated,
}: ApunteModalProps) {
  const isEditMode = Boolean(apunte)

  const action = isEditMode ? updateApunteAction : createApunteAction
  const submitApunte = async (
    previousState: ApunteActionState,
    formData: FormData,
  ) => {
    const nextState = await action(previousState, formData)

    if (nextState.ok) {
      if (nextState.apunte) onCreated?.(nextState.apunte)
      window.dispatchEvent(new CustomEvent('apuntes-changed'))
      onSuccess?.()
      onClose()
    }

    return nextState
  }
  const [state, formAction, pending] = useActionState(submitApunte, emptyState)

  const [titulo, setTitulo] = useState(apunte?.titulo ?? '')
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const {
    recursos,
    addRecurso,
    cancelHtmlReplace,
    handleHtmlFileChange,
    handleKindChange,
    handleNombreChange,
    handleUrlBlur,
    handleUrlChange,
    moveDown,
    moveUp,
    removeRecurso,
    startHtmlReplace,
  } = useApunteRecursos(apunte?.recursos)
  const initialCategoriaIds = useMemo(
    () => apunte?.categorias?.flatMap((categoria) => (categoria.id ? [categoria.id] : [])) ?? [],
    [apunte?.categorias],
  )
  const {
    highlightCategoriaIds,
    inferredCategoriaIds,
    selectedCategoriaIds,
    submitCategoriaIds,
    toggleCategoria,
  } = useAutoApunteCategories({
    categoriasDisponibles,
    initialCategoriaIds,
    recursos,
  })

  const [validationError, setValidationError] = useState('')

  const handleTituloChange = useCallback((value: string) => {
    setTitulo(value)
  }, [])

  // -------------------------------------------------------------------------
  // Client-side validation before submit
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      const errorMessage = getApunteFormValidationError(recursos, submitCategoriaIds)
      setValidationError(errorMessage)
      if (errorMessage) event.preventDefault()
    },
    [recursos, submitCategoriaIds],
  )

  const recursosJson = useMemo(() => serializeRecursos(recursos), [recursos])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Editar apunte' : 'Nuevo apunte'}
      className="max-w-2xl"
    >
      <form
        action={formAction}
        className="space-y-5"
        onSubmit={handleSubmit}
      >
        {/* Hidden IDs */}
        {isEditMode ? (
          <input type="hidden" name="apunteId" value={apunte!.id} />
        ) : (
          <input type="hidden" name="subjectId" value={subjectId} />
        )}
        <input type="hidden" name="recursosJson" value={recursosJson} />
        <input type="hidden" name="categoriaIdsJson" value={JSON.stringify(submitCategoriaIds)} />

        <ApunteTitleField value={titulo} onChange={handleTituloChange} />

        {/* Descripción — Rich Text */}
        <CollapsibleFormSection
          title="Descripción"
          hint="Opcional. Agregá una explicación corta si hace falta."
          open={descriptionOpen}
          onToggle={() => setDescriptionOpen((value) => !value)}
        >
          <RichTextEditor
            name="descripcionHtml"
            defaultValue={apunte?.descripcionHtml ?? ''}
            placeholder="Descripción del contenido"
          />
        </CollapsibleFormSection>

        <ApunteCategoriesField
          categoriasDisponibles={categoriasDisponibles}
          highlightCategoriaIds={highlightCategoriaIds}
          inferredCategoriaIds={inferredCategoriaIds}
          selectedCategoriaIds={selectedCategoriaIds}
          onToggleCategoria={toggleCategoria}
        />

        <ApunteResourcesField
          recursos={recursos}
          onAddRecurso={addRecurso}
          onCancelHtmlReplace={cancelHtmlReplace}
          onHtmlFileChange={handleHtmlFileChange}
          onKindChange={handleKindChange}
          onMoveDown={moveDown}
          onMoveUp={moveUp}
          onNombreChange={handleNombreChange}
          onRemove={removeRecurso}
          onStartHtmlReplace={startHtmlReplace}
          onUrlBlur={handleUrlBlur}
          onUrlChange={handleUrlChange}
        />

        <ApunteFormErrors actionMessage={state.ok ? '' : state.message} validationError={validationError} />

        <ApunteFormActions isEditMode={isEditMode} pending={pending} onClose={onClose} />
      </form>
    </Modal>
  )
}


function ApunteTitleField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <label htmlFor="apunte-titulo" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
        Título
      </label>
      <input
        id="apunte-titulo"
        type="text"
        name="titulo"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ej: Resumen Unidad 3"
        className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
      />
    </div>
  )
}

function ApunteCategoriesField({
  categoriasDisponibles,
  highlightCategoriaIds,
  inferredCategoriaIds,
  selectedCategoriaIds,
  onToggleCategoria,
}: {
  categoriasDisponibles: Array<{ id: string; nombre: string }>
  highlightCategoriaIds: Set<string>
  inferredCategoriaIds: Set<string>
  selectedCategoriaIds: string[]
  onToggleCategoria: (categoriaId: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Categorías</p>
      <div className="flex flex-wrap gap-2">
        {categoriasDisponibles.map((categoria) => {
          const active = selectedCategoriaIds.includes(categoria.id)
          const automatic = inferredCategoriaIds.has(categoria.id)
          const highlighted = highlightCategoriaIds.has(categoria.id)
          return (
            <button
              key={categoria.id}
              type="button"
              onClick={() => onToggleCategoria(categoria.id)}
              className={[
                'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-300',
                active
                  ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white',
                highlighted ? 'scale-105 shadow-[0_0_22px_rgba(103,232,249,0.25)]' : '',
              ].join(' ')}
            >
              {categoria.nombre}
              {automatic ? <span className="ml-1 text-[10px] text-cyan-100/60">auto</span> : null}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] leading-5 text-white/40">
        Las sugerencias aparecen según los recursos agregados, pero podés ajustar las categorías a mano.
      </p>
    </div>
  )
}

function ApunteResourcesField({
  recursos,
  onAddRecurso,
  onCancelHtmlReplace,
  onHtmlFileChange,
  onKindChange,
  onMoveDown,
  onMoveUp,
  onNombreChange,
  onRemove,
  onStartHtmlReplace,
  onUrlBlur,
  onUrlChange,
}: {
  recursos: RecursoDraft[]
  onAddRecurso: () => void
  onCancelHtmlReplace: (localId: string) => void
  onHtmlFileChange: (localId: string, file: File | null) => void
  onKindChange: (localId: string, kind: RecursoDraftKind) => void
  onMoveDown: (index: number) => void
  onMoveUp: (index: number) => void
  onNombreChange: (localId: string, value: string) => void
  onRemove: (localId: string) => void
  onStartHtmlReplace: (localId: string) => void
  onUrlBlur: (localId: string, value: string) => void
  onUrlChange: (localId: string, value: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
        Recursos <span className="font-normal normal-case tracking-normal text-white/30">(links o HTML)</span>
      </p>

      {recursos.length > 0 ? (
        <div className="space-y-3">
          {recursos.map((recurso, index) => (
            <RecursoRow
              key={recurso.localId}
              recurso={recurso}
              index={index}
              total={recursos.length}
              onKindChange={onKindChange}
              onUrlChange={onUrlChange}
              onUrlBlur={onUrlBlur}
              onHtmlFileChange={onHtmlFileChange}
              onStartHtmlReplace={onStartHtmlReplace}
              onCancelHtmlReplace={onCancelHtmlReplace}
              onNombreChange={onNombreChange}
              onRemove={onRemove}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onAddRecurso}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-white/10 bg-surface-0 px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Plus className="size-3.5" />
        Agregar recurso
      </button>
    </div>
  )
}

function ApunteFormErrors({ actionMessage, validationError }: { actionMessage: string; validationError: string }) {
  if (!validationError && !actionMessage) return null

  return (
    <div className="space-y-2">
      {validationError ? (
        <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {validationError}
        </p>
      ) : null}
      {actionMessage ? (
        <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {actionMessage}
        </p>
      ) : null}
    </div>
  )
}

function ApunteFormActions({
  isEditMode,
  pending,
  onClose,
}: {
  isEditMode: boolean
  pending: boolean
  onClose: () => void
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-white/5 pt-4">
      <button
        type="button"
        onClick={onClose}
        className="cursor-pointer rounded border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Guardando…' : isEditMode ? 'Guardar cambios' : 'Crear apunte'}
      </button>
    </div>
  )
}
