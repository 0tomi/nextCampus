'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'
import { AdminControls } from '@/components/admin/AdminControls'
import { DeleteApunteButton } from '@/components/admin/SubjectPageAdminOverlay'
import { ApunteRecursoView } from '@/components/apuntes/ApunteRecursoView'
import { CopyApunteLinkButton } from '@/components/apuntes/CopyApunteLinkButton'
import { DarkCard } from '@/components/ui/DarkCard'
import { SafeMarkdown } from '@/components/ui/SafeMarkdown'
import { EditApunteButton } from '@/components/admin/EditApunteButton'
import type { RecursoTipo } from '@/lib/recursos'

export interface CategoriaItem {
  id: string
  nombre: string
}

export interface ApunteFeedItem {
  id: string
  titulo: string
  slug: string
  descripcion: string | null
  createdAt: string
  createdByUserId: string | null
  categorias: CategoriaItem[]
  recursos: Array<{
    id: string
    tipo: RecursoTipo
    url: string
    orden: number
    nombre: string | null
    storageKey?: string | null
    mimeType?: string | null
    sizeBytes?: number | null
  }>
}

interface ApuntesPageResponse {
  items: ApunteFeedItem[]
  hasMore: boolean
  nextCursor: string | null
}

interface ApuntesFeedProps {
  subjectId: string
  subjectSlug: string
  yearId: string
  yearSlug: string
  categorias: CategoriaItem[]
  initialItems: ApunteFeedItem[]
  initialHasMore: boolean
  initialNextCursor: string | null
  focusApunteSlug?: string
  variant?: 'desktop' | 'mobile'
}

interface DesktopContentCardData {
  apunte: ApunteFeedItem
  apunteHref: string
  cardId: string
  col: 0 | 1
  isFirstOfApunte: boolean
  showApunteActions: boolean
  recurso: ApunteFeedItem['recursos'][number]
  row: number
}

interface ContentCardNeighbors {
  sameApunteDown: boolean
  sameApunteLeft: boolean
  sameApunteRight: boolean
  sameApunteUp: boolean
}

// El estado de paginación (lista, cursor, "hay más", carga y error) cambia
// siempre en bloque tras cada fetch, así que vive en un reducer: cada
// transición es una sola acción atómica en lugar de cinco setState sueltos.
interface FeedState {
  items: ApunteFeedItem[]
  hasMore: boolean
  nextCursor: string | null
  loading: boolean
  error: string
}

type FeedAction =
  | { type: 'load-start' }
  | {
      type: 'load-success'
      reset: boolean
      items: ApunteFeedItem[]
      hasMore: boolean
      nextCursor: string | null
    }
  | { type: 'load-error' }

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'load-start':
      return { ...state, loading: true, error: '' }
    case 'load-success':
      return {
        items: action.reset ? action.items : [...state.items, ...action.items],
        hasMore: action.hasMore,
        nextCursor: action.nextCursor,
        loading: false,
        error: '',
      }
    case 'load-error':
      return {
        ...state,
        loading: false,
        error: 'No pudimos cargar más apuntes. Probá de nuevo en unos segundos.',
      }
  }
}

function getInitialSelectedIds(categorias: CategoriaItem[]): string[] {
  if (typeof window === 'undefined') return []
  const params = new URLSearchParams(window.location.search)
  const values = params
    .getAll('categoria')
    .flatMap((value) =>
      value.split(',').flatMap((item) => {
        const trimmed = item.trim()
        return trimmed ? [trimmed] : []
      }),
    )
  const validIds = new Set(categorias.map((categoria) => categoria.id))
  return [...new Set(values.filter((value) => validIds.has(value)))]
}

function updateUrl(selectedIds: readonly string[]) {
  const url = new URL(window.location.href)
  url.searchParams.delete('categoria')
  selectedIds.forEach((id) => url.searchParams.append('categoria', id))
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

function buildDesktopContentCards(
  items: ApunteFeedItem[],
  yearSlug: string,
  subjectSlug: string,
): DesktopContentCardData[] {
  let linearIndex = 0

  return items.flatMap((apunte) => {
    const apunteHref = `/${yearSlug}/${subjectSlug}/apuntes/${apunte.slug}`

    return apunte.recursos.map((recurso, recursoIndex) => {
      const card: DesktopContentCardData = {
        apunte,
        apunteHref,
        cardId: `${apunte.id}-${recurso.id}`,
        col: (linearIndex % 2) as 0 | 1,
        isFirstOfApunte: recursoIndex === 0,
        showApunteActions: apunte.recursos.length > 1 ? recursoIndex === 1 : recursoIndex === 0,
        recurso,
        row: Math.floor(linearIndex / 2),
      }
      linearIndex += 1
      return card
    })
  })
}

function getContentCardNeighbors(
  cards: DesktopContentCardData[],
  card: DesktopContentCardData,
): ContentCardNeighbors {
  const byPosition = new Map(cards.map((item) => [`${item.row}:${item.col}`, item]))
  const sameApunte = (candidate: DesktopContentCardData | undefined) => candidate?.apunte.id === card.apunte.id

  return {
    sameApunteDown: sameApunte(byPosition.get(`${card.row + 1}:${card.col}`)),
    sameApunteLeft: sameApunte(byPosition.get(`${card.row}:${card.col - 1}`)),
    sameApunteRight: sameApunte(byPosition.get(`${card.row}:${card.col + 1}`)),
    sameApunteUp: sameApunte(byPosition.get(`${card.row - 1}:${card.col}`)),
  }
}

export function ApuntesFeed({
  subjectId,
  subjectSlug,
  yearId,
  yearSlug,
  categorias,
  initialItems,
  initialHasMore,
  initialNextCursor,
  focusApunteSlug,
  variant = 'desktop',
}: ApuntesFeedProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => getInitialSelectedIds(categorias))
  const [{ items, hasMore, nextCursor, loading, error }, dispatch] = useReducer(feedReducer, {
    items: initialItems,
    hasMore: initialHasMore,
    nextCursor: initialNextCursor,
    loading: false,
    error: '',
  })
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement | null> | null>(null)
  const firstRunRef = useRef(true)
  const getCardRefs = useCallback(() => {
    if (cardRefs.current === null) {
      cardRefs.current = new Map()
    }
    return cardRefs.current
  }, [])

  const loadPage = useCallback(
    async ({ reset, cursor }: { reset: boolean; cursor?: string | null }) => {
      dispatch({ type: 'load-start' })
      try {
        const params = new URLSearchParams({ subjectId })
        selectedIds.forEach((id) => params.append('categoria', id))
        if (cursor) params.set('cursor', cursor)

        const response = await fetch(`/api/apuntes?${params.toString()}`)
        if (!response.ok) throw new Error('No se pudieron cargar los apuntes.')
        const page = (await response.json()) as ApuntesPageResponse
        dispatch({
          type: 'load-success',
          reset,
          items: page.items,
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
        })
      } catch {
        dispatch({ type: 'load-error' })
      }
    },
    [selectedIds, subjectId],
  )

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false
      if (selectedIds.length === 0) return
    }
    updateUrl(selectedIds)
    void loadPage({ reset: true })
  }, [loadPage, selectedIds])

  // Recarga la lista cuando se crea, edita o elimina un apunte en cualquier
  // parte de la pantalla, para que el cambio aparezca al instante sin recargar.
  useEffect(() => {
    const handleApuntesChanged = () => {
      void loadPage({ reset: true })
    }
    window.addEventListener('apuntes-changed', handleApuntesChanged)
    return () => window.removeEventListener('apuntes-changed', handleApuntesChanged)
  }, [loadPage])

  useEffect(() => {
    if (!focusApunteSlug) return
    const handle = window.requestAnimationFrame(() => {
      const node = getCardRefs().get(focusApunteSlug)
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(handle)
  }, [focusApunteSlug, getCardRefs, items])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loading) return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadPage({ reset: false, cursor: nextCursor })
      }
    }, { rootMargin: '320px 0px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadPage, loading, nextCursor])

  const toggleCategoria = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selected) => selected !== id) : [...prev, id],
    )
  }

  const desktopCards = buildDesktopContentCards(items, yearSlug, subjectSlug)

  const addApunteButton = variant === 'mobile' ? (
    <AdminControls yearId={yearId} noWrapper>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-new-apunte'))}
        className="mb-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] text-sm font-bold text-white transition-colors hover:bg-white/10"
      >
        <Plus size={16} strokeWidth={2.5} />
        Agregar apuntes
      </button>
    </AdminControls>
  ) : null

  return (
    <div className={variant === 'mobile' ? 'px-[18px]' : 'space-y-4'}>
      {addApunteButton}
      <div
        className={variant === 'mobile'
          ? '-mx-[18px] flex flex-nowrap gap-2 overflow-x-auto px-[18px] pb-1 scrollbar-none'
          : 'flex flex-wrap gap-2'}
      >
        <button
          type="button"
          onClick={() => setSelectedIds([])}
          className={[
            'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
            selectedIds.length === 0
              ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100'
              : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07] hover:text-white',
          ].join(' ')}
        >
          Todos
        </button>
        {categorias.map((categoria) => {
          const active = selectedIds.includes(categoria.id)
          return (
            <button
              key={categoria.id}
              type="button"
              onClick={() => toggleCategoria(categoria.id)}
              className={[
                'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                active
                  ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100'
                  : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07] hover:text-white',
              ].join(' ')}
            >
              {categoria.nombre}
            </button>
          )
        })}
      </div>

      {items.length === 0 && !loading ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-surface-1 px-6 py-10 text-center text-sm text-white/50">
          No hay apuntes con esas categorías.
        </div>
      ) : variant === 'desktop' ? (
        <div className="stagger-children grid items-start gap-4 xl:grid-cols-2">
          {desktopCards.map((card) => (
            <DesktopContentCard
              key={card.cardId}
              card={card}
              focusApunteSlug={focusApunteSlug}
              neighbors={getContentCardNeighbors(desktopCards, card)}
              subjectSlug={subjectSlug}
              yearId={yearId}
              yearSlug={yearSlug}
              setRef={(node) => {
                if (!card.isFirstOfApunte) return
                if (node) getCardRefs().set(card.apunte.slug, node)
                else getCardRefs().delete(card.apunte.slug)
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((apunte) => (
            <ApunteCard
              key={apunte.id}
              apunte={apunte}
              yearId={yearId}
              yearSlug={yearSlug}
              subjectSlug={subjectSlug}
              focusApunteSlug={focusApunteSlug}
              variant={variant}
              setRef={(node) => {
                if (node) getCardRefs().set(apunte.slug, node)
                else getCardRefs().delete(apunte.slug)
              }}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loading ? <p className="py-3 text-center text-xs font-semibold text-white/45">Cargando más apuntes…</p> : null}
      {error ? <p className="py-3 text-center text-xs font-semibold text-rose-300">{error}</p> : null}
      {!hasMore && items.length > 0 ? (
        <p className="py-3 text-center text-xs font-semibold text-white/35">Ya viste todos los apuntes disponibles.</p>
      ) : null}
    </div>
  )
}

function DesktopContentCard({
  card,
  focusApunteSlug,
  neighbors,
  subjectSlug,
  yearId,
  yearSlug,
  setRef,
}: {
  card: DesktopContentCardData
  focusApunteSlug?: string
  neighbors: ContentCardNeighbors
  subjectSlug: string
  yearId: string
  yearSlug: string
  setRef: (node: HTMLDivElement | null) => void
}) {
  const { apunte, apunteHref, isFirstOfApunte, recurso, showApunteActions } = card
  const enfocado = focusApunteSlug === apunte.slug && isFirstOfApunte
  const shouldShowHeader = isFirstOfApunte || (!neighbors.sameApunteLeft && !neighbors.sameApunteUp)
  const shouldShowActions = showApunteActions || (!neighbors.sameApunteRight && !neighbors.sameApunteDown)

  const wrapperClassName = [
    'scroll-mt-24',
    neighbors.sameApunteLeft ? '-ml-4 w-[calc(100%+1rem)]' : '',
    'h-[500px]',
  ].filter(Boolean).join(' ')
  const cardClassName = [
    'relative flex h-full w-full flex-col overflow-hidden p-5',
    neighbors.sameApunteLeft ? 'border-l-0' : '',
    neighbors.sameApunteRight ? 'border-r-0' : '',
    neighbors.sameApunteDown ? 'border-b-0' : '',
    neighbors.sameApunteUp ? '-mt-4 h-[calc(100%+1rem)]' : '',
    neighbors.sameApunteUp ? 'border-t-0' : '',
    enfocado ? 'ring-1 ring-white/20' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={setRef}
      className={wrapperClassName}
    >
      <DarkCard className={cardClassName}>
        {(shouldShowHeader || neighbors.sameApunteLeft) ? (
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute top-[112px] z-10 h-px bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent',
              neighbors.sameApunteLeft ? 'left-0' : 'left-5',
              neighbors.sameApunteRight ? 'right-0' : 'right-5',
            ].join(' ')}
          />
        ) : null}
        <div className={['relative shrink-0', shouldShowHeader ? 'mb-3 h-[92px]' : 'hidden'].join(' ')}>
          {shouldShowHeader ? (
            <div className="h-full">
              <div className={shouldShowActions ? 'pr-[168px]' : ''}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Apunte</p>
                </div>
                <h3
                  className="mt-2 truncate text-xl font-black tracking-tight text-white transition-all hover:underline"
                  title={apunte.titulo}
                >
                  <Link href={apunteHref}>{apunte.titulo}</Link>
                </h3>
                {apunte.categorias.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {apunte.categorias.map((categoria) => (
                      <span
                        key={categoria.id}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45"
                      >
                        {categoria.nombre}
                      </span>
                    ))}
                  </div>
                ) : null}
                {apunte.descripcion ? (
                  <SafeMarkdown
                    stripLinks
                    className="mt-2 line-clamp-1 text-sm leading-6 text-white/62 [&_p]:m-0 [&_strong]:text-white"
                    content={apunte.descripcion}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {shouldShowActions ? (
          <div className="absolute right-5 top-5 z-20 flex items-center gap-1.5">
            <AdminControls yearId={yearId} ownerUserId={apunte.createdByUserId} noWrapper>
              <div className="flex gap-1">
                <EditApunteButton
                  apunte={{
                    id: apunte.id,
                    titulo: apunte.titulo,
                    slug: apunte.slug,
                    descripcion: apunte.descripcion ?? '',
                    recursos: apunte.recursos,
                    categorias: apunte.categorias,
                  }}
                />
                <DeleteApunteButton apunteId={apunte.id} subjectSlug={subjectSlug} yearId={yearId} ownerUserId={apunte.createdByUserId} />
              </div>
            </AdminControls>
            <CopyApunteLinkButton
              yearSlug={yearSlug}
              subjectSlug={subjectSlug}
              apunteSlug={apunte.slug}
              className="px-2.5 py-1.5"
            />
          </div>
        ) : null}

        <div className="relative mt-auto h-[356px] min-h-0">
          <ApunteRecursoView recurso={recurso} variant="content-card" apunteHref={apunteHref} htmlLoadMode="on-click" />
        </div>
      </DarkCard>
    </div>
  )
}

function ApunteCard({
  apunte,
  yearId,
  yearSlug,
  subjectSlug,
  focusApunteSlug,
  variant,
  setRef,
}: {
  apunte: ApunteFeedItem
  yearId: string
  yearSlug: string
  subjectSlug: string
  focusApunteSlug?: string
  variant: 'desktop' | 'mobile'
  setRef: (node: HTMLDivElement | null) => void
}) {
  const enfocado = focusApunteSlug === apunte.slug
  const apunteHref = `/${yearSlug}/${subjectSlug}/apuntes/${apunte.slug}`
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Apunte</p>
          </div>
          <h3 className={variant === 'desktop'
            ? 'mt-2 text-xl font-black tracking-tight text-white transition-all hover:underline'
            : 'mt-1 text-base font-black leading-tight text-white transition-all hover:underline'}>
            <Link href={apunteHref}>{apunte.titulo}</Link>
          </h3>
          {apunte.categorias.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {apunte.categorias.map((categoria) => (
                <span
                  key={categoria.id}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45"
                >
                  {categoria.nombre}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <AdminControls yearId={yearId} ownerUserId={apunte.createdByUserId} noWrapper>
          <div className="flex shrink-0 gap-1">
            {variant === 'desktop' ? (
              <EditApunteButton
                apunte={{
                  id: apunte.id,
                  titulo: apunte.titulo,
                  slug: apunte.slug,
                  descripcion: apunte.descripcion ?? '',
                  recursos: apunte.recursos,
                  categorias: apunte.categorias,
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-admin-modal-edit-apunte', {
                      detail: { apunte: { ...apunte, descripcion: apunte.descripcion ?? '' } },
                    }),
                  )
                }}
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                title="Editar apunte"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            <DeleteApunteButton apunteId={apunte.id} subjectSlug={subjectSlug} yearId={yearId} ownerUserId={apunte.createdByUserId} />
          </div>
        </AdminControls>
      </div>

      {apunte.descripcion ? (
        <div className="mt-3 relative overflow-hidden">
          <SafeMarkdown
            stripLinks
            className={
              variant === 'desktop'
                ? 'line-clamp-3 text-sm leading-6 text-white/65 transition-colors [&_p]:m-0 [&_strong]:text-white'
                : 'line-clamp-3 text-sm leading-6 text-white/60 transition-colors [&_p]:m-0 [&_strong]:text-white'
            }
            content={apunte.descripcion}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-surface-0 to-transparent" />
        </div>
      ) : null}

      {apunte.recursos.length > 0 ? (
        <div className={variant === 'desktop' ? 'mt-4 flex flex-col gap-3' : 'flex flex-col gap-3'}>
          {apunte.recursos.slice(0, 3).map((recurso) => (
            <ApunteRecursoView key={recurso.id} recurso={recurso} apunteHref={apunteHref} htmlLoadMode="on-click" />
          ))}
          {apunte.recursos.length > 3 ? (
            <Link
              href={apunteHref}
              className="mt-1 block cursor-pointer py-1 text-center text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300 hover:underline"
            >
              Y otros {apunte.recursos.length - 3} recursos. Abrí el apunte para verlos todos.
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className={variant === 'desktop' ? 'mt-4 flex flex-wrap gap-2' : 'flex flex-wrap gap-2'}>
        <CopyApunteLinkButton yearSlug={yearSlug} subjectSlug={subjectSlug} apunteSlug={apunte.slug} />
      </div>
    </>
  )

  if (variant === 'desktop') {
    return (
      <div
        ref={setRef}
        className="scroll-mt-24"
      >
        <DarkCard className={['flex flex-col p-5', enfocado ? 'ring-1 ring-white/20' : ''].join(' ')}>
          {content}
        </DarkCard>
      </div>
    )
  }

  return (
    <div
      ref={setRef}
      className={[
        'relative flex flex-col gap-3 rounded-xl border bg-[#1a1a1a] p-5 transition-colors',
        enfocado ? 'border-white/20' : 'border-white/5',
      ].join(' ')}
    >
      {content}
    </div>
  )
}
