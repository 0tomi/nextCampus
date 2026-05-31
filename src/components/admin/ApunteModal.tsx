'use client'

import { useEffect, useActionState, useState, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import { Modal } from '@/components/ui/Modal'
import { Plus, Trash2, AlertCircle, CirclePlay, ChevronUp, ChevronDown, FileCode2, Info } from 'lucide-react'
import {
  createApunteAction,
  updateApunteAction,
  type ApunteActionState,
} from '@/app/admin/actions'
import { detectarRecurso, type RecursoTipo } from '@/lib/recursos'
import { inferirCategoriasDeApunte } from '@/lib/apunte-categorias'
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
  categorias?: Array<{ id: string; nombre: string }>
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
  categoriasDisponibles: Array<{ id: string; nombre: string }>
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
const INTERACTIVE_NOTE_FILE_RE = /\.(html?|jsx|tsx)$/i

function detectTipo(url: string): RecursoTipo | null {
  if (!url.trim()) return null
  return detectarRecurso(url)?.tipo ?? null
}

function CollapsibleFormSection({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string
  hint: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-white/8 bg-white/[0.018]">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 px-3 py-3 text-left transition-colors hover:bg-white/[0.025]"
        aria-expanded={open}
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/45">
            {title}
          </span>
          <span className="mt-1 block text-[11px] leading-4 text-white/35">
            {hint}
          </span>
        </span>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/55 transition-colors group-hover:text-white">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
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
  categoriasDisponibles,
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
  const [linkOpen, setLinkOpen] = useState(false)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
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
  const fallbackCategoriaId = categoriasDisponibles.find((categoria) => categoria.nombre === 'Otro')?.id ?? categoriasDisponibles[0]?.id ?? ''
  const [selectedCategoriaIds, setSelectedCategoriaIds] = useState<string[]>(() =>
    apunte?.categorias?.map((categoria) => categoria.id).filter(Boolean) ?? [],
  )
  const [dismissedAutoCategoriaIds, setDismissedAutoCategoriaIds] = useState<Set<string>>(() => new Set())
  const autoSelectedCategoriaIdsRef = useRef<Set<string>>(new Set())
  const [highlightCategoriaIds, setHighlightCategoriaIds] = useState<Set<string>>(() => new Set())
  const [validationError, setValidationError] = useState('')

  // Close modal on success
  useEffect(() => {
    if (state.ok) {
      onSuccess?.()
      onClose()
    }
  }, [state.ok, onClose, onSuccess])

  const inferredCategoriaIds = useMemo(() => {
    const inferredNames = inferirCategoriasDeApunte(
      recursos.map((recurso) => ({
        tipo: recurso.tipo,
        url: recurso.url,
        nombre: recurso.nombre,
        fileName: recurso.fileName,
      })),
    )
    const ids = inferredNames
      .map((nombre) => categoriasDisponibles.find((categoria) => categoria.nombre === nombre)?.id)
      .filter((id): id is string => Boolean(id))
    return new Set(ids)
  }, [categoriasDisponibles, recursos])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDismissedAutoCategoriaIds((prev) => {
        const next = new Set([...prev].filter((id) => inferredCategoriaIds.has(id)))
        return next.size === prev.size ? prev : next
      })

      setSelectedCategoriaIds((prev) => {
        const next = new Set(prev)
        const addedAutomatically: string[] = []
        const removedAutomatically: string[] = []

        for (const id of autoSelectedCategoriaIdsRef.current) {
          if (!inferredCategoriaIds.has(id)) {
            next.delete(id)
            removedAutomatically.push(id)
          }
        }

        for (const id of inferredCategoriaIds) {
          if (!dismissedAutoCategoriaIds.has(id) && !next.has(id)) {
            next.add(id)
            addedAutomatically.push(id)
          }
        }

        removedAutomatically.forEach((id) => autoSelectedCategoriaIdsRef.current.delete(id))
        addedAutomatically.forEach((id) => autoSelectedCategoriaIdsRef.current.add(id))

        if (addedAutomatically.length > 0) {
          setHighlightCategoriaIds(new Set(addedAutomatically))
          window.setTimeout(() => setHighlightCategoriaIds(new Set()), 900)
        }
        const asArray = [...next]
        return asArray.length === prev.length && asArray.every((id, idx) => id === prev[idx]) ? prev : asArray
      })
    }, 0)

    return () => window.clearTimeout(handle)
  }, [dismissedAutoCategoriaIds, inferredCategoriaIds])

  const submitCategoriaIds = useMemo(() => {
    if (selectedCategoriaIds.length > 0) return selectedCategoriaIds

    const inferredNotDismissed = [...inferredCategoriaIds].filter((id) => !dismissedAutoCategoriaIds.has(id))
    if (inferredNotDismissed.length > 0) return inferredNotDismissed
    if (inferredCategoriaIds.size > 0) return []

    return fallbackCategoriaId ? [fallbackCategoriaId] : []
  }, [dismissedAutoCategoriaIds, fallbackCategoriaId, inferredCategoriaIds, selectedCategoriaIds])

  const toggleCategoria = useCallback((categoriaId: string) => {
    setSelectedCategoriaIds((prev) => {
      if (prev.includes(categoriaId)) {
        if (prev.length === 1) return prev
        autoSelectedCategoriaIdsRef.current.delete(categoriaId)
        if (inferredCategoriaIds.has(categoriaId)) {
          setDismissedAutoCategoriaIds((dismissed) => new Set(dismissed).add(categoriaId))
        }
        return prev.filter((id) => id !== categoriaId)
      }
      setDismissedAutoCategoriaIds((dismissed) => {
        const next = new Set(dismissed)
        next.delete(categoriaId)
        return next
      })
      autoSelectedCategoriaIdsRef.current.delete(categoriaId)
      return [...prev, categoriaId]
    })
  }, [inferredCategoriaIds])

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
        const isInteractiveNote = INTERACTIVE_NOTE_FILE_RE.test(file.name)
        return {
          ...r,
          tipo: 'HTML',
          fileName: file.name,
          error: isInteractiveNote ? undefined : 'Subí un archivo HTML, JSX o TSX',
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
        setValidationError('Seleccioná un archivo para cada apunte interactivo.')
        return
      }

      const htmlWithErrors = recursos.find((r) => r.kind === 'HTML' && r.error)
      if (htmlWithErrors) {
        e.preventDefault()
        setValidationError('Revisá los apuntes interactivos antes de guardar.')
        return
      }

      if (submitCategoriaIds.length === 0) {
        e.preventDefault()
        setValidationError('Elegí al menos una categoría.')
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
    [recursos, slugError, submitCategoriaIds.length],
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
        <input type="hidden" name="categoriaIdsJson" value={JSON.stringify(submitCategoriaIds)} />

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
        <CollapsibleFormSection
          title="Link compartible"
          hint="Opcional. Si no lo tocás, se crea desde el título."
          open={linkOpen}
          onToggle={() => setLinkOpen((value) => !value)}
        >
          <div className="space-y-1">
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
        </CollapsibleFormSection>

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

        {/* Categorías */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Categorías
          </p>
          <div className="flex flex-wrap gap-2">
            {categoriasDisponibles.map((categoria) => {
              const active = selectedCategoriaIds.includes(categoria.id)
              const automatic = inferredCategoriaIds.has(categoria.id)
              const highlighted = highlightCategoriaIds.has(categoria.id)
              return (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => toggleCategoria(categoria.id)}
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
// Prompt copiable para generar apuntes interactivos con IA.
// Editá libremente este texto: es lo que se copia al tocar "Tocá acá".
// ---------------------------------------------------------------------------

const HTML_PROMPT = `Vas a recibir un material de estudio. Ese material NO es algo que tengas que comentar, resumir ni anotar: es únicamente el TEMARIO, es decir, la lista de temas y conceptos que tu apunte nuevo tiene que cubrir. Tratalo como materia prima.

Dato más importante de todos: el estudiante que va a usar tu apunte JAMÁS va a ver el material original. Tu apunte lo reemplaza por completo. Si algo no está explicado dentro de tu apunte, para el estudiante simplemente no existe. Por eso no estás "mejorando" un texto: estás construyendo desde cero un apunte autocontenido y definitivo que enseña esos temas mejor de lo que cualquier texto plano podría.

Tu tarea: identificá la idea general y cada concepto del temario, sin dejar ninguno afuera, y armá una clase didáctica, visual e interactiva que explique cada concepto de forma progresiva, construyéndolo paso a paso.

== REGLAS PEDAGÓGICAS (el corazón del apunte) ==

- Explicá desde cero. Cada concepto, ejemplo y fórmula debe explicarse desde sus fundamentos, como si el estudiante no supiera absolutamente nada del tema. No asumas que tiene otro material al lado: no lo tiene.

- Prohibido comentar en vez de enseñar. Está terminantemente prohibido usar frases que solo tienen sentido teniendo el texto original al lado, como "como vimos", "según el apunte", "el texto menciona", "el ejemplo anterior", "recordemos que". Si una frase remite a un material externo, está mal: reescribila explicando la idea en su totalidad.

- Ningún ejemplo sin su explicación. Cada ejemplo, caso o ejercicio que muestres tiene que venir acompañado de su explicación completa: qué representa, por qué es así, paso a paso, y qué tiene que observar el estudiante. Mostrar un ejemplo y seguir de largo no sirve.

- No pases por encima. Si un concepto es importante, tomate el tiempo de desarrollarlo en profundidad. Preferí explicar bien lo central antes que mencionar muchas cosas superficialmente.

- Formato presentación. Estructurá el apunte como una secuencia guiada donde cada idea se revela y se construye progresivamente. El estudiante debería poder avanzar y ver cómo la idea se va formando, no recibir todo de golpe como un muro de texto.

== MANDATO VISUAL (no es decoración, es la forma de enseñar) ==

- Lo abstracto se vuelve visual, siempre. Todo concepto abstracto, ecuación, algoritmo, estructura o proceso DEBE tener una representación visual interactiva o animada que lo modele. Si algo se puede mostrar en movimiento o manipular, no lo expliques solo con texto.

- Fidelidad sobre adorno. Las animaciones y gráficos tienen que REPRESENTAR fielmente el mecanismo real de lo que se explica: cómo cambia una variable, cómo itera un algoritmo, cómo se deforma una curva, cómo fluyen los datos. Nunca pongas animaciones que solo decoran y no enseñan nada.

- Ejemplos del tipo de interacción que se espera: sliders que recalculan una fórmula y su gráfico en vivo mientras el estudiante mueve los parámetros; un algoritmo que se ejecuta paso a paso resaltando en cada iteración qué elemento cambia y por qué; diagramas que se arman ante el ojo a medida que se explica cada parte; simulaciones manipulables; autoevaluaciones con feedback inmediato. Usá la expresividad de React y el navegador al máximo para que el estudiante APRENDA, no solo lea.

== PRIORIDAD ==

Profundidad sobre los conceptos centrales por encima de la exhaustividad superficial. Y por encima de todo: el apunte tiene que FUNCIONAR y renderizar de verdad. Un artefacto que corre y explica bien lo central vale más que uno gigantesco que se trunca o no abre. Si tenés que elegir, garantizá primero que funcione.

== CONTRATO TÉCNICO (cumplir SIN EXCEPCIÓN) ==

- Formato de entrega: Exportá todo como un ÚNICO archivo React, preferiblemente TSX, con un componente default listo para renderizarse. Incluí los estilos dentro del mismo componente o del mismo archivo.

- Tono educativo: Explicado de forma sencilla sin perder rigor sobre la materia, sin dejar detalles afuera. Es un apunte para estudiar.

- Diseño responsivo: El documento debe verse bien tanto en interfaz de Desktop como en una interfaz de Teléfono como lo es 9:16.

- Dependencias y Expresividad: Debe ser un único archivo. La ÚNICA sentencia "import" permitida es la de React y sus hooks (import React, { useState, useEffect } from 'react'). NO uses "import" de ninguna otra librería, ni "import()" dinámico, ni "require()": el apunte se rechaza y no abre.

- Cómo usar librerías externas (CDN): Para aprovechar librerías de gráficos, animación, diagramas o matemática NO las importás: las cargás en tiempo de ejecución inyectando una etiqueta <script> (y <link> para su CSS) que apunte a un build UMD/global, y después las usás desde el objeto window. El patrón correcto es: dentro de un useEffect, creás el <script> con document.createElement, le ponés el src del CDN, esperás su evento onload, y recién ahí leés la librería desde window (por ejemplo window.Chart, window.d3, window.gsap) y dibujás. IMPORTANTE: los scripts y estilos SOLO pueden cargarse desde estos tres hosts (cualquier otro dominio queda bloqueado y el apunte no carga): https://cdn.jsdelivr.net , https://unpkg.com y https://cdnjs.cloudflare.com . Solo sirven librerías con build de navegador (UMD/global); no uses librerías solo-ESM ni que dependan de React (como Recharts o Framer Motion), porque no se enganchan a esta instancia de React.

- Librerías recomendadas (todas tienen build UMD/global y aligeran tu código en vez de dibujar todo a mano): KaTeX o MathJax para fórmulas matemáticas; Chart.js para gráficos de datos (barras, líneas, dispersión); D3 o Plotly para visualizaciones y gráficos científicos más ricos; p5.js para simulaciones, física y animaciones generativas sobre canvas; GSAP o anime.js para animar transiciones y revelar conceptos paso a paso; Mermaid para diagramas de flujo, árboles y secuencias. Elegí las que mejor representen cada tema; no estás obligado a usar todas. Cualquier otro recurso con build de navegador que mejore la comprensión es bienvenido, siempre que no requiera archivos locales.

- Fórmulas matemáticas: Si el apunte presenta fórmulas matemáticas, presentar dichas ecuaciones utilizando algún motor compatible que renderice LaTeX (por ejemplo, cargando dinámicamente KaTeX o MathJax por CDN) para que el estudiante pueda interpretar el apunte fácilmente.

- Enfoque de contenido (Directiva Crítica): NO incluir frases, referencias o directivas proveídas por el usuario dentro del apunte generado. El apunte debe estar redactado para el estudiante que quiere conocer la información sobre los temas que trata el propio recurso; no interesan los detalles técnicos que te pidió el usuario para generar dicho apunte.

Debes devolverme un TSX que cumpla con estas características a rajatabla.`

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
  const [infoAbierta, setInfoAbierta] = useState(false)

  const toggleInfo = useCallback(() => {
    setInfoAbierta((prev) => !prev)
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
      <div className="mb-2 flex items-center gap-1 rounded border border-white/8 bg-surface-0 p-1">
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
          onClick={() => onKindChange(recurso.localId, 'HTML')}
          className={[
            'flex-1 rounded px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
            recurso.kind === 'HTML'
              ? 'bg-white/10 text-white'
              : 'text-white/45 hover:bg-white/5 hover:text-white/70',
          ].join(' ')}
        >
          Apunte Interactivo
        </button>
        <button
          type="button"
          onClick={toggleInfo}
          aria-label="¿Qué es este tipo de recurso?"
          aria-expanded={infoAbierta}
          className={[
            'inline-flex size-6 shrink-0 items-center justify-center rounded transition-colors cursor-pointer',
            infoAbierta ? 'text-cyan-300' : 'text-white/40 hover:text-white/80',
          ].join(' ')}
        >
          <Info className="size-3.5" />
        </button>
      </div>

      {/* Panel de info desplegable — muestra la info del tipo seleccionado */}
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
            {recurso.kind === 'LINK' ? (
              <p>
                Al ser un proyecto gratuito, contamos con almacenamiento limitado.
                Por eso preferimos que compartas un link hacia el recurso vía
                Drive, o un video vía YouTube. Ambos recursos ofrecen una
                previsualización una vez subido el apunte.
              </p>
            ) : (
              <p>
                Los apuntes interactivos permiten subir explicaciones mucho más
                efectivas y súper útiles para estudiar. Este recurso está pensado
                para que subas un archivo hecho con IA explicando algo sobre el
                apunte, o el apunte en sí mismo.{' '}
                <button
                  type="button"
                  onClick={copiarPrompt}
                  className="cursor-pointer font-semibold text-cyan-300 underline decoration-dotted underline-offset-2 hover:text-cyan-200"
                >
                  {promptCopiado ? '¡Prompt copiado!' : 'Tocá acá'}
                </button>{' '}
                para copiar un prompt que podés usar para que tu IA favorita te
                arme un apunte interactivo.
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
                Apunte interactivo cargado
              </div>
            ) : (
              <input
                type="file"
                aria-label="Archivo del apunte interactivo"
                name={`htmlFile:${recurso.localId}`}
                accept=".html,.htm,.jsx,.tsx,text/html,text/javascript,application/javascript"
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
