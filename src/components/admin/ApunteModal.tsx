'use client'

import { useEffect, useActionState, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Modal } from '@/components/ui/Modal'
import { Plus, Trash2, AlertCircle, CirclePlay, ChevronUp, ChevronDown, FileCode2, Info } from 'lucide-react'
import {
  createApunteAction,
  updateApunteAction,
  type ApunteActionState,
} from '@/app/admin/actions'
import { detectarRecurso, type RecursoTipo } from '@/lib/recursos'
import { slugify } from '@/lib/slug'
import { RichTextEditor } from './RichTextEditor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApunteFull = {
  id: string
  titulo: string
  descripcionHtml: string
  /** Link compartible del apunte. Opcional para no romper callsites que aún no lo proveen. */
  slug?: string | null
  recursos: Array<{
    id: string
    tipo: 'YOUTUBE' | 'DRIVE' | 'HTML'
    url: string
    orden: number
    /** Nombre custom del recurso (fallback genérico cuando es null). */
    nombre?: string | null
    storageKey?: string | null
    mimeType?: string | null
    sizeBytes?: number | null
  }>
}

type RecursoDraftKind = 'LINK' | 'HTML'

interface RecursoDraft {
  /** Local key — nunca se manda al server */
  localId: string
  kind: RecursoDraftKind
  url: string
  tipo: RecursoTipo | null
  nombre: string
  storageKey?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  fileName?: string
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

function makeDraft(
  url: string,
  tipo: RecursoTipo | null,
  nombre: string = '',
  extra?: Partial<RecursoDraft>,
): RecursoDraft {
  return {
    localId: crypto.randomUUID(),
    kind: tipo === 'HTML' ? 'HTML' : 'LINK',
    url,
    tipo,
    nombre,
    ...extra,
  }
}

const SLUG_REGEX = /^[a-z0-9-]+$/

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

  const action = isEditMode ? updateApunteAction : createApunteAction
  const [state, formAction, pending] = useActionState(action, emptyState)

  const [titulo, setTitulo] = useState(apunte?.titulo ?? '')
  const [slug, setSlug] = useState(apunte?.slug ?? '')
  // Si ya hay slug cargado al abrir el modal (modo edición con slug), tratamos
  // el campo como "tocado por el usuario" para no auto-sobrescribirlo al editar
  // el título. Si está vacío, el slug se autogenera del título.
  const slugTouchedRef = useRef(Boolean(apunte?.slug && apunte.slug.length > 0))
  const [slugError, setSlugError] = useState('')
  const [recursos, setRecursos] = useState<RecursoDraft[]>(() =>
    apunte
      ? apunte.recursos.map((r) =>
          makeDraft(r.url, r.tipo, r.nombre ?? '', {
            storageKey: r.storageKey,
            mimeType: r.mimeType,
            sizeBytes: r.sizeBytes,
          }),
        )
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

  const handleSlugChange = useCallback((value: string) => {
    slugTouchedRef.current = true
    // Normalizamos a lowercase para que coincida con la regla del backend.
    const normalized = value.toLowerCase()
    setSlug(normalized)
    if (normalized.length === 0) {
      setSlugError('')
      return
    }
    if (!SLUG_REGEX.test(normalized)) {
      setSlugError('Solo letras, números y guiones (sin espacios ni acentos).')
    } else if (normalized.length > 80) {
      setSlugError('Demasiado largo, máximo 80 caracteres.')
    } else {
      setSlugError('')
    }
  }, [])

  const handleTituloChange = useCallback((value: string) => {
    setTitulo(value)
    if (slugTouchedRef.current) return
    const trimmed = value.trim()
    setSlug(trimmed.length === 0 ? '' : slugify(trimmed))
  }, [])

  const addRecurso = useCallback(() => {
    setRecursos((prev) => [...prev, makeDraft('', null)])
  }, [])

  const handleKindChange = useCallback((localId: string, kind: RecursoDraftKind) => {
    setRecursos((prev) =>
      prev.map((r) =>
        r.localId === localId
          ? {
              ...r,
              kind,
              tipo: kind === 'HTML' ? 'HTML' : detectTipo(r.url),
              error: undefined,
            }
          : r,
      ),
    )
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

  const handleNombreChange = useCallback(
    (localId: string, value: string) => {
      setRecursos((prev) =>
        prev.map((r) =>
          r.localId === localId ? { ...r, nombre: value } : r,
        ),
      )
    },
    [],
  )

  const handleHtmlFileChange = useCallback((localId: string, file: File | null) => {
    setRecursos((prev) =>
      prev.map((r) => {
        if (r.localId !== localId) return r
        if (!file) {
          return { ...r, fileName: undefined, tipo: 'HTML', error: undefined }
        }
        const isHtml = /\.html?$/i.test(file.name) && (!file.type || file.type === 'text/html')
        return {
          ...r,
          tipo: 'HTML',
          fileName: file.name,
          error: isHtml ? undefined : 'Subí un archivo .html o .htm',
        }
      }),
    )
  }, [])

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

      const invalidHtml = recursos.find(
        (r) => r.kind === 'HTML' && !r.storageKey && !r.fileName,
      )
      if (invalidHtml) {
        e.preventDefault()
        setValidationError('Seleccioná un archivo HTML para cada recurso interactivo.')
        return
      }

      const htmlWithErrors = recursos.find((r) => r.kind === 'HTML' && r.error)
      if (htmlWithErrors) {
        e.preventDefault()
        setValidationError('Revisá los archivos HTML antes de guardar.')
        return
      }

      if (slugError) {
        e.preventDefault()
        setValidationError(
          'Revisá el link compartible: ' + slugError.toLowerCase(),
        )
        return
      }

      // Nothing to prevent — let the form action run
    },
    [recursos, slugError],
  )

  // Serialize recursos for the hidden input
  const recursosJson = JSON.stringify(
    recursos
      .filter((r) => (r.kind === 'HTML' ? r.tipo === 'HTML' : r.url.trim() && r.tipo))
      .map((r, idx) => {
        const nombre = r.nombre.trim()
        if (r.kind === 'HTML') {
          return {
            tipo: 'HTML',
            localId: r.localId,
            url: '',
            orden: idx,
            ...(nombre.length > 0 ? { nombre } : {}),
            ...(r.storageKey ? { storageKey: r.storageKey } : {}),
            ...(r.mimeType ? { mimeType: r.mimeType } : {}),
            ...(r.sizeBytes ? { sizeBytes: r.sizeBytes } : {}),
          }
        }
        return {
          url: r.url.trim(),
          tipo: r.tipo!,
          orden: idx,
          ...(nombre.length > 0 ? { nombre } : {}),
        }
      }),
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
            onChange={(e) => handleTituloChange(e.target.value)}
            placeholder="Ej: Resumen Unidad 3"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        {/* Link compartible (slug) */}
        <div className="space-y-1">
          <label
            htmlFor="apunte-slug"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Link compartible{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <input
            id="apunte-slug"
            type="text"
            name="slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="se-genera-desde-el-titulo"
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            className={`w-full rounded border bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none ${
              slugError
                ? 'border-rose-400/50 focus:border-rose-400/70'
                : 'border-white/10 focus:border-white/20'
            }`}
          />
          {slugError ? (
            <p className="text-[11px] text-rose-400">{slugError}</p>
          ) : (
            <p className="text-[11px] text-white/40">
              Link: /{subjectSlug}/apuntes/{slug || 'mi-apunte'}
            </p>
          )}
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
              (links o HTML)
            </span>
          </p>

          {recursos.length > 0 && (
            <div className="space-y-3">
              {recursos.map((recurso, idx) => (
                <RecursoRow
                  key={recurso.localId}
                  recurso={recurso}
                  index={idx}
                  total={recursos.length}
                  onKindChange={handleKindChange}
                  onUrlChange={handleUrlChange}
                  onUrlBlur={handleUrlBlur}
                  onHtmlFileChange={handleHtmlFileChange}
                  onNombreChange={handleNombreChange}
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
// Prompt copiable para generar apuntes HTML con IA.
// Editá libremente este texto: es lo que se copia al tocar "Tocá acá".
// ---------------------------------------------------------------------------

const HTML_PROMPT = `Revisá los apuntes que te voy a pasar. Identificá la idea general y cada concepto que aparece, sin dejar ninguno afuera. Después armá una clase didáctica y entretenida que explique cada concepto de forma progresiva, iterando uno por uno.

Exportá esa clase como un ÚNICO archivo HTML que incluya todos los estilos (CSS) y scripts (JS) necesarios para funcionar de forma autónoma, sin dependencias externas. Ese HTML tiene que funcionar como un apunte interactivo: que vaya explicando los conceptos paso a paso y que aproveche los medios de expresividad e interactividad que ofrece el HTML (animaciones, ejemplos en vivo, autoevaluaciones, diagramas) para que quien lo use aprenda al máximo.`

// ---------------------------------------------------------------------------
// RecursoRow — individual resource row in the list
// ---------------------------------------------------------------------------

interface RecursoRowProps {
  recurso: RecursoDraft
  index: number
  total: number
  onKindChange: (localId: string, kind: RecursoDraftKind) => void
  onUrlChange: (localId: string, value: string) => void
  onUrlBlur: (localId: string, value: string) => void
  onHtmlFileChange: (localId: string, file: File | null) => void
  onNombreChange: (localId: string, value: string) => void
  onRemove: (localId: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

function nombreFallbackHint(tipo: RecursoTipo | null): string | null {
  if (tipo === 'HTML') return 'Se mostrará como vista interactiva'
  if (tipo === 'DRIVE') return "Se mostrará como “Archivo de Drive”"
  if (tipo === 'YOUTUBE') return "Se mostrará como “Video de YouTube”"
  return null
}

function RecursoRow({
  recurso,
  index,
  total,
  onKindChange,
  onUrlChange,
  onUrlBlur,
  onHtmlFileChange,
  onNombreChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: RecursoRowProps) {
  const hint = nombreFallbackHint(recurso.tipo)
  const showHint = recurso.nombre.trim().length === 0 && hint !== null

  const [promptCopiado, setPromptCopiado] = useState(false)
  const [infoAbierta, setInfoAbierta] = useState<RecursoDraftKind | null>(null)

  const toggleInfo = useCallback((kind: RecursoDraftKind) => {
    setInfoAbierta((prev) => (prev === kind ? null : kind))
  }, [])

  const copiarPrompt = useCallback(() => {
    navigator.clipboard
      .writeText(HTML_PROMPT)
      .then(() => {
        setPromptCopiado(true)
        setTimeout(() => setPromptCopiado(false), 2000)
      })
      .catch(() => {
        /* clipboard no disponible — ignoramos silenciosamente */
      })
  }, [])

  return (
    <div className="rounded-lg border border-white/10 bg-surface-1/40 p-2.5">
      <div className="mb-2 flex gap-1 rounded border border-white/8 bg-surface-0 p-1">
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => onKindChange(recurso.localId, 'LINK')}
            className={[
              'flex-1 rounded px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              recurso.kind === 'LINK'
                ? 'bg-white/10 text-white'
                : 'text-white/45 hover:bg-white/5 hover:text-white/70',
            ].join(' ')}
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => toggleInfo('LINK')}
            aria-label="¿Qué es un recurso de tipo Link?"
            aria-expanded={infoAbierta === 'LINK'}
            className={[
              'inline-flex size-6 shrink-0 items-center justify-center rounded transition-colors cursor-pointer',
              infoAbierta === 'LINK'
                ? 'text-cyan-300'
                : 'text-white/40 hover:text-white/80',
            ].join(' ')}
          >
            <Info className="size-3.5" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => onKindChange(recurso.localId, 'HTML')}
            className={[
              'flex-1 rounded px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              recurso.kind === 'HTML'
                ? 'bg-white/10 text-white'
                : 'text-white/45 hover:bg-white/5 hover:text-white/70',
            ].join(' ')}
          >
            Archivo HTML
          </button>
          <button
            type="button"
            onClick={() => toggleInfo('HTML')}
            aria-label="¿Qué es un recurso de tipo Archivo HTML?"
            aria-expanded={infoAbierta === 'HTML'}
            className={[
              'inline-flex size-6 shrink-0 items-center justify-center rounded transition-colors cursor-pointer',
              infoAbierta === 'HTML'
                ? 'text-cyan-300'
                : 'text-white/40 hover:text-white/80',
            ].join(' ')}
          >
            <Info className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Panel de info desplegable */}
      <div
        className={[
          'grid transition-all duration-300 ease-out',
          infoAbierta
            ? 'mb-2 grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0',
        ].join(' ')}
      >
        <div className="overflow-hidden">
          <div className="rounded-lg border border-white/10 bg-surface-0 p-3 text-[12px] leading-relaxed text-white/70">
            {infoAbierta === 'LINK' && (
              <p>
                Al ser un proyecto gratuito, contamos con almacenamiento limitado.
                Por eso preferimos que compartas un link hacia el recurso vía
                Drive, o un video vía YouTube. Ambos recursos ofrecen una
                previsualización una vez subido el apunte.
              </p>
            )}
            {infoAbierta === 'HTML' && (
              <p>
                Los archivos HTML (los de las páginas web) permiten subir apuntes
                interactivos mucho más efectivos y súper útiles para estudiar.
                Este recurso está pensado para que subas un HTML hecho con IA
                explicando algo sobre el apunte, o el apunte en sí mismo.{' '}
                <button
                  type="button"
                  onClick={copiarPrompt}
                  className="cursor-pointer font-semibold text-cyan-300 underline decoration-dotted underline-offset-2 hover:text-cyan-200"
                >
                  {promptCopiado ? '¡Prompt copiado!' : 'Tocá acá'}
                </button>{' '}
                para copiar un prompt que podés usar para que tu IA favorita te
                arme un apunte en HTML.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {recurso.kind === 'LINK' ? (
          <div className="relative flex-1">
            <input
              type="url"
              aria-label="Link del recurso"
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
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
              {recurso.tipo === 'YOUTUBE' && (
                <CirclePlay className="size-4 text-red-400" />
              )}
              {recurso.tipo === 'DRIVE' && (
                <Image
                  src="/resources/google_drive_logo_icon_159334.png"
                  alt="Drive"
                  width={16}
                  height={16}
                  className="size-4"
                />
              )}
              {recurso.error && (
                <AlertCircle className="size-4 text-rose-400" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1">
            {recurso.storageKey ? (
              <div className="flex min-h-10 items-center gap-2 rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white/70">
                <FileCode2 className="size-4 text-cyan-300" />
                HTML cargado
              </div>
            ) : (
              <input
                type="file"
                aria-label="Archivo HTML del recurso"
                name={`htmlFile:${recurso.localId}`}
                accept=".html,.htm,text/html"
                onChange={(e) => onHtmlFileChange(recurso.localId, e.target.files?.[0] ?? null)}
                className={`w-full cursor-pointer rounded border bg-surface-0 px-3 py-2 text-sm text-white file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15 ${
                  recurso.error ? 'border-rose-400/50' : 'border-white/10'
                }`}
              />
            )}
          </div>
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
            <ChevronUp className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            title="Bajar"
            className="inline-flex h-5 w-6 items-center justify-center rounded-b border-x border-b border-white/8 bg-surface-0 text-white/40 transition-colors enabled:hover:bg-white/5 enabled:hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronDown className="size-3" />
          </button>
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(recurso.localId)}
          title="Eliminar recurso"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-rose-400/60 transition-colors hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {recurso.error && (
        <p className="mt-1.5 text-[11px] text-rose-400">{recurso.error}</p>
      )}

      {/* Nombre del recurso */}
      <div className="mt-2 space-y-1">
        <input
          type="text"
          aria-label="Nombre del recurso"
          value={recurso.nombre}
          onChange={(e) => onNombreChange(recurso.localId, e.target.value)}
          placeholder="Nombre del recurso (opcional)"
          maxLength={120}
          className="w-full rounded border border-white/10 bg-surface-0 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
        />
        {showHint && (
          <p className="text-[11px] text-white/40">{hint}</p>
        )}
      </div>
    </div>
  )
}
