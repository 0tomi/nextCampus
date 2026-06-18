'use client'

import { useCallback, useEffect, useEffectEvent, useId, useReducer, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileText, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApunteSearchItem } from '@/lib/domain/apunte-search'
import { groupApunteSearchItems } from './apunte-search-groups'

const SEARCH_DELAY_MS = 220
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  DRIVE: 'Drive',
  HTML: 'Interactivo',
  OTHER: 'Recurso',
  REPOSITORY: 'Repositorio',
  YOUTUBE: 'Video',
}

type GlobalApunteSearchVariant = 'desktop' | 'mobile'

type SearchState = {
  query: string
  items: ApunteSearchItem[]
  loading: boolean
  error: string
}

type SearchAction =
  | { type: 'query-changed'; query: string }
  | { type: 'search-start' }
  | { type: 'search-success'; items: ApunteSearchItem[] }
  | { type: 'search-error'; error: string }
  | { type: 'reset' }

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'query-changed':
      return { ...state, query: action.query, items: [], loading: false, error: '' }
    case 'search-start':
      return { ...state, loading: true, error: '' }
    case 'search-success':
      return { ...state, items: action.items, loading: false, error: '' }
    case 'search-error':
      return { ...state, items: [], loading: false, error: action.error }
    case 'reset':
      return { query: '', items: [], loading: false, error: '' }
  }
}

export function GlobalApunteSearch({ variant }: { variant: GlobalApunteSearchVariant }) {
  const [open, setOpen] = useState(false)
  const [state, dispatch] = useReducer(searchReducer, {
    query: '',
    items: [],
    loading: false,
    error: '',
  })
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchControllerRef = useRef<AbortController | null>(null)
  const searchTimeoutRef = useRef<number | null>(null)
  const titleId = useId()
  const inputId = useId()
  const trimmedQuery = state.query.trim()

  const clearPendingSearch = useCallback(() => {
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    searchControllerRef.current?.abort()
    searchControllerRef.current = null
  }, [])

  const closeSearch = useCallback(() => {
    clearPendingSearch()
    dispatch({ type: 'reset' })
    setOpen(false)
  }, [clearPendingSearch])

  const closeSearchEvent = useEffectEvent(() => closeSearch())

  const runSearch = useCallback(async (query: string, controller: AbortController) => {
    dispatch({ type: 'search-start' })
    try {
      const response = await fetch(`/api/apuntes/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
      const body = (await response.json().catch(() => null)) as {
        items?: ApunteSearchItem[]
        error?: string
      } | null
      if (!response.ok) throw new Error(body?.error ?? 'No pudimos buscar ahora.')
      if (searchControllerRef.current !== controller) return
      dispatch({ type: 'search-success', items: body?.items ?? [] })
    } catch (error) {
      if ((error as Error).name === 'AbortError' || searchControllerRef.current !== controller) return
      dispatch({ type: 'search-error', error: 'No pudimos buscar ahora. Probá de nuevo en unos segundos.' })
    } finally {
      if (searchControllerRef.current === controller) searchControllerRef.current = null
    }
  }, [])

  const scheduleSearch = useCallback((query: string) => {
    clearPendingSearch()
    const nextQuery = query.trim()
    if (nextQuery.length < 2 || nextQuery.length > 120) return

    const controller = new AbortController()
    searchControllerRef.current = controller
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTimeoutRef.current = null
      void runSearch(nextQuery, controller)
    }, SEARCH_DELAY_MS)
  }, [clearPendingSearch, runSearch])

  const handleQueryChange = useCallback((query: string) => {
    dispatch({ type: 'query-changed', query })
    scheduleSearch(query)
  }, [scheduleSearch])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (event: Event) => {
      event.preventDefault()
      closeSearchEvent()
    }

    if (!dialog.open) dialog.showModal()
    dialog.addEventListener('cancel', handleCancel)

    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      if (dialog.open) dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => () => clearPendingSearch(), [clearPendingSearch])

  return (
    <>
      <SearchTrigger variant={variant} onOpen={() => setOpen(true)} />
      {open ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          className="fixed inset-0 z-[90] m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-transparent p-0 text-white backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Cerrar búsqueda"
            onClick={closeSearch}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={cn(
              'relative z-10 mx-auto overflow-hidden border border-white/8 bg-surface-1 text-white shadow-[0_24px_80px_rgba(0,0,0,0.62)]',
              variant === 'desktop'
                ? 'mt-[calc(4.75rem+var(--spacing-safe-top))] w-[min(680px,calc(100vw-2rem))] rounded-none'
                : 'mt-[calc(4rem+var(--spacing-safe-top))] w-[calc(100vw-1rem)] rounded-none',
            )}
          >
            <div className="border-b border-white/6 p-3">
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-surface-0 px-3">
                <Search className="size-4 shrink-0 text-white/38" />
                <label htmlFor={inputId} className="sr-only">
                  Buscar apuntes
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  value={state.query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  type="search"
                  placeholder="Buscar apuntes por tema o materia"
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-semibold text-white placeholder:text-white/34 focus:ring-0"
                />
                {state.loading ? <Loader2 className="size-4 animate-spin text-white/42" /> : null}
                {state.query ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearPendingSearch()
                      dispatch({ type: 'reset' })
                      inputRef.current?.focus()
                    }}
                    aria-label="Limpiar búsqueda"
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-white/42 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="max-h-[min(66vh,520px)] overflow-y-auto p-3">
              <SearchContent
                closeSearch={closeSearch}
                error={state.error}
                items={state.items}
                loading={state.loading}
                query={trimmedQuery}
                titleId={titleId}
              />
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  )
}

function SearchTrigger({ variant, onOpen }: { variant: GlobalApunteSearchVariant; onOpen: () => void }) {
  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="Buscar apuntes"
        className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-white/66 transition-colors hover:bg-white/7 hover:text-white"
      >
        <Search size={17} strokeWidth={2.2} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Buscar apuntes"
      className="absolute left-1/2 top-1/2 hidden h-10 w-[min(360px,32vw)] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-black/12 px-4 text-sm font-semibold text-white/58 transition-colors hover:bg-white/5 hover:text-white lg:flex"
    >
      <Search className="size-4 shrink-0" />
      <span className="truncate">Buscar apuntes</span>
    </button>
  )
}

function SearchContent({
  closeSearch,
  error,
  items,
  loading,
  query,
  titleId,
}: {
  closeSearch: () => void
  error: string
  items: ApunteSearchItem[]
  loading: boolean
  query: string
  titleId: string
}) {
  if (!query) {
    return (
      <SearchMessage
        titleId={titleId}
        title="Buscá por tema, materia o tipo de material."
        description="Probá con palabras como “parcial”, “punteros” o el nombre de una materia."
      />
    )
  }

  if (query.length < 2) {
    return (
      <SearchMessage
        titleId={titleId}
        title="Escribí al menos 2 caracteres."
        description="Con una palabra un poco más completa podemos encontrar mejores resultados."
      />
    )
  }

  if (query.length > 120) {
    return (
      <SearchMessage
        titleId={titleId}
        title="Probá con una búsqueda más corta."
        description="Usá una palabra o frase breve para encontrar el material más rápido."
      />
    )
  }

  if (error) {
    return <SearchMessage titleId={titleId} title={error} tone="danger" />
  }

  if (loading && items.length === 0) {
    return <SearchMessage titleId={titleId} title="Buscando apuntes…" />
  }

  if (!loading && items.length === 0) {
    return (
      <SearchMessage
        titleId={titleId}
        title="No encontramos apuntes con esas palabras."
        description="Probá con una búsqueda más corta o con el nombre de la materia."
      />
    )
  }

  const groups = groupApunteSearchItems(items)

  return (
    <div className="space-y-4">
      <h2 id={titleId} className="px-1 text-sm font-black text-white">
        {items.length} {items.length === 1 ? 'resultado' : 'resultados'} para “{query}”
      </h2>
      <ul className="space-y-4" aria-label="Resultados de búsqueda">
        {groups.map((group) => (
          <li key={group.key} className="space-y-2">
            <div className="px-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/34">
                {group.yearName}
              </p>
              <h3 className="text-sm font-black text-white/82">{group.subjectName}</h3>
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <SearchResultItem key={item.id} closeSearch={closeSearch} item={item} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SearchResultItem({ closeSearch, item }: { closeSearch: () => void; item: ApunteSearchItem }) {
  const labels = buildMetaLabels(item)

  return (
    <Link
      href={item.href}
      onClick={closeSearch}
      className="group flex cursor-pointer items-start gap-3 rounded-md border border-transparent px-3 py-3 transition-colors hover:border-white/8 hover:bg-white/[0.035] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/[0.035] text-white/50 transition-colors group-hover:text-white">
        <FileText className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-white">{item.title}</span>
        <span className="mt-1 block truncate text-xs font-semibold text-white/46">
          {item.subject.name} · {item.year.name}
        </span>
        {labels.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-white/38"
              >
                {label}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <ArrowRight className="mt-2 size-4 shrink-0 text-white/22 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
    </Link>
  )
}

function SearchMessage({
  description,
  title,
  titleId,
  tone = 'neutral',
}: {
  description?: string
  title: string
  titleId: string
  tone?: 'neutral' | 'danger'
}) {
  return (
    <div className="flex items-start gap-3 rounded-none border border-dashed border-white/10 bg-white/[0.02] p-4">
      <span className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg border',
        tone === 'danger'
          ? 'border-rose-300/20 bg-rose-400/10 text-rose-200'
          : 'border-white/8 bg-white/[0.035] text-white/46',
      )}>
        <Search className="size-4" />
      </span>
      <div>
        <h2
          id={titleId}
          className={cn('text-sm font-black leading-snug', tone === 'danger' ? 'text-rose-100' : 'text-white')}
        >
          {title}
        </h2>
        {description ? <p className="mt-1.5 text-sm leading-6 text-white/48">{description}</p> : null}
      </div>
    </div>
  )
}

function buildMetaLabels(item: ApunteSearchItem) {
  const resourceLabels = item.resourceTypes.map((type) => RESOURCE_TYPE_LABELS[type] ?? 'Recurso')
  return [...new Set([...item.categories, ...resourceLabels])].slice(0, 5)
}
