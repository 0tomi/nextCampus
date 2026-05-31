'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'
import { AdminControls } from '@/components/admin/AdminControls'
import { DeleteApunteButton } from '@/components/admin/SubjectPageAdminOverlay'
import { ApunteRecursoView } from '@/components/apuntes/ApunteRecursoView'
import { CopyApunteLinkButton } from '@/components/apuntes/CopyApunteLinkButton'
import { DarkCard } from '@/components/ui/DarkCard'
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
  descripcionHtml: string | null
  createdAt: string
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

function getInitialSelectedIds(categorias: CategoriaItem[]): string[] {
  if (typeof window === 'undefined') return []
  const params = new URLSearchParams(window.location.search)
  const values = params
    .getAll('categoria')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
  const validIds = new Set(categorias.map((categoria) => categoria.id))
  return [...new Set(values.filter((value) => validIds.has(value)))]
}

function updateUrl(selectedIds: readonly string[]) {
  const url = new URL(window.location.href)
  url.searchParams.delete('categoria')
  selectedIds.forEach((id) => url.searchParams.append('categoria', id))
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
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
  const [items, setItems] = useState<ApunteFeedItem[]>(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const firstRunRef = useRef(true)

  const loadPage = useCallback(
    async ({ reset, cursor }: { reset: boolean; cursor?: string | null }) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ subjectId })
        selectedIds.forEach((id) => params.append('categoria', id))
        if (cursor) params.set('cursor', cursor)

        const response = await fetch(`/api/apuntes?${params.toString()}`)
        if (!response.ok) throw new Error('No se pudieron cargar los apuntes.')
        const page = (await response.json()) as ApuntesPageResponse
        setItems((prev) => (reset ? page.items : [...prev, ...page.items]))
        setHasMore(page.hasMore)
        setNextCursor(page.nextCursor)
      } catch {
        setError('No pudimos cargar más apuntes. Probá de nuevo en unos segundos.')
      } finally {
        setLoading(false)
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

  useEffect(() => {
    if (!focusApunteSlug) return
    const handle = window.requestAnimationFrame(() => {
      const node = cardRefs.current.get(focusApunteSlug)
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(handle)
  }, [focusApunteSlug, items])

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

  const containerClass = variant === 'desktop'
    ? 'stagger-children grid gap-4 xl:grid-cols-2'
    : 'flex flex-col gap-3'

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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedIds([])}
          className={[
            'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
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
                'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
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
      ) : (
        <div className={containerClass}>
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
                if (node) cardRefs.current.set(apunte.slug, node)
                else cardRefs.current.delete(apunte.slug)
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Apunte</p>
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
        <AdminControls yearId={yearId} noWrapper>
          <div className="flex shrink-0 gap-1">
            {variant === 'desktop' ? (
              <EditApunteButton
                apunte={{
                  id: apunte.id,
                  titulo: apunte.titulo,
                  slug: apunte.slug,
                  descripcionHtml: apunte.descripcionHtml ?? '',
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
                      detail: { apunte: { ...apunte, descripcionHtml: apunte.descripcionHtml ?? '' } },
                    }),
                  )
                }}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                title="Editar apunte"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <DeleteApunteButton apunteId={apunte.id} subjectSlug={subjectSlug} yearId={yearId} />
          </div>
        </AdminControls>
      </div>

      {apunte.descripcionHtml ? (
        <div
          className={variant === 'desktop'
            ? 'mt-4 space-y-2 text-sm leading-6 text-white/62 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white'
            : 'text-sm leading-6 text-white/60 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white'}
          dangerouslySetInnerHTML={{ __html: apunte.descripcionHtml }}
        />
      ) : null}

      {apunte.recursos.length > 0 ? (
        <div className={variant === 'desktop' ? 'mt-4 flex flex-col gap-3' : 'flex flex-col gap-3'}>
          {apunte.recursos.slice(0, 3).map((recurso) => (
            <ApunteRecursoView key={recurso.id} recurso={recurso} apunteHref={apunteHref} />
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
      <div ref={setRef} className="scroll-mt-24">
        <DarkCard className={['flex h-full flex-col p-5', enfocado ? 'ring-1 ring-white/20' : ''].join(' ')}>
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