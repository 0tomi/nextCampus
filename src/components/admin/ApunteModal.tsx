'use client'

import { useEffect, useActionState, useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Plus, Trash2, AlertCircle, CirclePlay, ChevronUp, ChevronDown } from 'lucide-react'
import {
  createApunteAction,
  updateApunteAction,
  type ApunteActionState,
} from '@/app/admin/actions'
import { detectarRecurso, type RecursoTipo } from '@/lib/recursos'
import { RichTextEditor } from './RichTextEditor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApunteFull = {
  id: string
  titulo: string
  descripcionHtml: string
  recursos: Array<{ id: string; tipo: 'YOUTUBE' | 'DRIVE'; url: string; orden: number }>
}

interface RecursoDraft {
  /** Local key — nunca se manda al server */
  localId: string
  url: string
  tipo: RecursoTipo | null
  error?: string
}

interface ApunteModalProps {
  open: boolean
  onClose: () => void
  subjectId: string
  subjectSlug: string
  apunte?: ApunteFull
  onSuccess?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyState: ApunteActionState = { ok: false, message: '' }

function makeDraft(url: string, tipo: RecursoTipo | null): RecursoDraft {
  return { localId: crypto.randomUUID(), url, tipo }
}

function detectTipo(url: string): RecursoTipo | null {
  if (!url.trim()) return null
  return detectarRecurso(url)?.tipo ?? null
}

// ---------------------------------------------------------------------------
// ApunteModal
// ---------------------------------------------------------------------------

export function ApunteModal({
  open,
  onClose,
  subjectId,
  subjectSlug,
  apunte,
  onSuccess,
}: ApunteModalProps) {
  const isEditMode = Boolean(apunte)
  void subjectSlug

  const action = isEditMode ? updateApunteAction : createApunteAction
  const [state, formAction, pending] = useActionState(action, emptyState)

  const [titulo, setTitulo] = useState(apunte?.titulo ?? '')
  const [recursos, setRecursos] = useState<RecursoDraft[]>(() =>
    apunte
      ? apunte.recursos.map((r) => makeDraft(r.url, r.tipo))
      : [],
  )
  const [validationError, setValidationError] = useState('')

  // Close modal on success
  useEffect(() => {
    if (state.ok) {
      onSuccess?.()
      onClose()
    }
  }, [state.ok, onClose, onSuccess])

  // -------------------------------------------------------------------------
  // Recurso handlers
  // -------------------------------------------------------------------------

  const addRecurso = useCallback(() => {
    setRecursos((prev) => [...prev, makeDraft('', null)])
  }, [])

  const removeRecurso = useCallback((localId: string) => {
    setRecursos((prev) => prev.filter((r) => r.localId !== localId))
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index === 0) return
    setRecursos((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])

  const moveDown = useCallback((index: number) => {
    setRecursos((prev) => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])

  const handleUrlChange = useCallback(
    (localId: string, value: string) => {
      setRecursos((prev) =>
        prev.map((r) =>
          r.localId === localId
            ? { ...r, url: value, tipo: null, error: undefined }
            : r,
        ),
      )
    },
    [],
  )

  const handleUrlBlur = useCallback((localId: string, value: string) => {
    if (!value.trim()) {
      setRecursos((prev) =>
        prev.map((r) =>
          r.localId === localId ? { ...r, tipo: null, error: undefined } : r,
        ),
      )
      return
    }
    const tipo = detectTipo(value)
    setRecursos((prev) =>
      prev.map((r) =>
        r.localId === localId
          ? {
              ...r,
              tipo,
              error: tipo ? undefined : 'Solo links de YouTube o Drive',
            }
          : r,
      ),
    )
  }, [])

  // -------------------------------------------------------------------------
  // Client-side validation before submit
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      setValidationError('')

      const invalid = recursos.filter((r) => r.url.trim() && !r.tipo)
      if (invalid.length > 0) {
        e.preventDefault()
        setValidationError(
          'Hay links inválidos. Revisá que sean de YouTube o Google Drive.',
        )
        return
      }

      // Nothing to prevent — let the form action run
    },
    [recursos],
  )

  // Serialize recursos for the hidden input
  const recursosJson = JSON.stringify(
    recursos
      .filter((r) => r.url.trim() && r.tipo)
      .map((r, idx) => ({ url: r.url.trim(), tipo: r.tipo!, orden: idx })),
  )

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

        {/* Título */}
        <div className="space-y-1">
          <label
            htmlFor="apunte-titulo"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Título
          </label>
          <input
            id="apunte-titulo"
            type="text"
            name="titulo"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Resumen Unidad 3"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        {/* Descripción — Rich Text */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">
            Descripción{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <RichTextEditor
            name="descripcionHtml"
            defaultValue={apunte?.descripcionHtml ?? ''}
            placeholder="Descripción del contenido"
          />
        </div>

        {/* Recursos */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Recursos{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (YouTube o Drive)
            </span>
          </p>

          {recursos.length > 0 && (
            <div className="space-y-2">
              {recursos.map((recurso, idx) => (
                <RecursoRow
                  key={recurso.localId}
                  recurso={recurso}
                  index={idx}
                  total={recursos.length}
                  onUrlChange={handleUrlChange}
                  onUrlBlur={handleUrlBlur}
                  onRemove={removeRecurso}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addRecurso}
            className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-surface-0 px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar recurso
          </button>
        </div>

        {/* Errors */}
        {validationError && (
          <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {validationError}
          </p>
        )}
        {state.message && !state.ok && (
          <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {state.message}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-white/5 pt-4">
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
            {pending
              ? 'Guardando…'
              : isEditMode
                ? 'Guardar cambios'
                : 'Crear apunte'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// RecursoRow — individual resource row in the list
// ---------------------------------------------------------------------------

interface RecursoRowProps {
  recurso: RecursoDraft
  index: number
  total: number
  onUrlChange: (localId: string, value: string) => void
  onUrlBlur: (localId: string, value: string) => void
  onRemove: (localId: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

function RecursoRow({
  recurso,
  index,
  total,
  onUrlChange,
  onUrlBlur,
  onRemove,
  onMoveUp,
  onMoveDown,
}: RecursoRowProps) {
  return (
    <div className="flex items-center gap-2">
      {/* URL input + icon */}
      <div className="relative flex-1">
        <input
          type="url"
          value={recurso.url}
          onChange={(e) => onUrlChange(recurso.localId, e.target.value)}
          onBlur={(e) => onUrlBlur(recurso.localId, e.target.value)}
          placeholder="https://youtube.com/watch?v=... o https://drive.google.com/..."
          className={`w-full rounded border bg-surface-0 px-3 py-2 pr-9 text-sm text-white placeholder:text-white/30 focus:outline-none ${
            recurso.error
              ? 'border-rose-400/50 focus:border-rose-400/70'
              : 'border-white/10 focus:border-white/20'
          }`}
        />
        {/* Type indicator */}
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          {recurso.tipo === 'YOUTUBE' && (
            <CirclePlay className="h-4 w-4 text-red-400" />
          )}
          {recurso.tipo === 'DRIVE' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/resources/google_drive_logo_icon_159334.png"
              alt="Drive"
              className="h-4 w-4"
            />
          )}
          {recurso.error && (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
        </div>
      </div>

      {/* Validation message */}
      {recurso.error && (
        <p className="absolute mt-6 text-[10px] text-rose-400">{recurso.error}</p>
      )}

      {/* Reorder buttons */}
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          title="Subir"
          className="inline-flex h-5 w-6 items-center justify-center rounded-t border border-white/8 bg-surface-0 text-white/40 transition-colors enabled:hover:bg-white/5 enabled:hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          title="Bajar"
          className="inline-flex h-5 w-6 items-center justify-center rounded-b border-x border-b border-white/8 bg-surface-0 text-white/40 transition-colors enabled:hover:bg-white/5 enabled:hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(recurso.localId)}
        title="Eliminar recurso"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-rose-400/60 transition-colors hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
