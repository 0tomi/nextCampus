'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { renderAuditEntry, timeAgo } from '@/lib/audit-renderer'
import type { AuditDetail } from '@/lib/audit'

export interface HistorialEntry {
  id: string
  action: string
  detail: AuditDetail | null
  createdAt: string
  userEmail: string | null
  userId: string
}

export interface HistorialUserOption {
  id: string
  email: string
}

interface HistorialActionOption {
  value: string
  label: string
}

interface HistorialListProps {
  entries: HistorialEntry[]
  initialHasMore: boolean
  initialNextCursor: string | null
  initialSelectedUsers: HistorialUserOption[]
  initialSelectedActions: string[]
  actionOptions: HistorialActionOption[]
}

interface HistorialResponse {
  items: HistorialEntry[]
  hasMore: boolean
  nextCursor: string | null
}

const ABSOLUTE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function updateUrl(users: readonly HistorialUserOption[], actions: readonly string[]) {
  const url = new URL(window.location.href)
  url.searchParams.delete('userId')
  url.searchParams.delete('action')
  users.forEach((user) => url.searchParams.append('userId', user.id))
  actions.forEach((action) => url.searchParams.append('action', action))
  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
}

export function HistorialList({
  entries,
  initialHasMore,
  initialNextCursor,
  initialSelectedUsers,
  initialSelectedActions,
  actionOptions,
}: HistorialListProps) {
  const [items, setItems] = useState(entries)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [selectedUsers, setSelectedUsers] = useState(initialSelectedUsers)
  const [selectedActions, setSelectedActions] = useState(initialSelectedActions)
  const [userQuery, setUserQuery] = useState('')
  const [userOptions, setUserOptions] = useState<HistorialUserOption[]>([])
  const [loading, setLoading] = useState(false)
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [error, setError] = useState('')
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const firstRunRef = useRef(true)

  const selectedUserIds = useMemo(() => selectedUsers.map((user) => user.id), [selectedUsers])

  const loadPage = useCallback(async ({ reset, cursor }: { reset: boolean; cursor?: string | null }) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      selectedUserIds.forEach((id) => params.append('userId', id))
      selectedActions.forEach((action) => params.append('action', action))
      if (cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/admin/historial?${params.toString()}`)
      if (!response.ok) throw new Error('No se pudo cargar el historial.')
      const page = (await response.json()) as HistorialResponse
      setItems((prev) => (reset ? page.items : [...prev, ...page.items]))
      setHasMore(page.hasMore)
      setNextCursor(page.nextCursor)
    } catch {
      setError('No pudimos cargar más movimientos. Probá de nuevo en unos segundos.')
    } finally {
      setLoading(false)
    }
  }, [selectedActions, selectedUserIds])

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    updateUrl(selectedUsers, selectedActions)
    void loadPage({ reset: true })
  }, [loadPage, selectedActions, selectedUsers])

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setSearchingUsers(true)
      try {
        const params = new URLSearchParams()
        if (userQuery.trim()) params.set('q', userQuery.trim())
        const response = await fetch(`/api/admin/historial/users?${params.toString()}`)
        if (!response.ok) throw new Error('No se pudieron buscar usuarios.')
        const data = (await response.json()) as { users: HistorialUserOption[] }
        setUserOptions(data.users.filter((user) => !selectedUserIds.includes(user.id)))
      } catch {
        setUserOptions([])
      } finally {
        setSearchingUsers(false)
      }
    }, 250)

    return () => window.clearTimeout(handle)
  }, [selectedUserIds, userQuery])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loading) return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadPage({ reset: false, cursor: nextCursor })
      }
    }, { rootMargin: '360px 0px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadPage, loading, nextCursor])

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((value) => value !== action) : [...prev, action],
    )
  }

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== userId))
  }

  const addUser = (user: HistorialUserOption) => {
    setSelectedUsers((prev) => prev.some((selected) => selected.id === user.id) ? prev : [...prev, user])
    setUserQuery('')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/8 bg-surface-1/70 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-2">
            <label htmlFor="historial-user-search" className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">
              Personas
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                id="historial-user-search"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="Buscar por correo"
                className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/20"
              />
            </div>
            <div className="flex min-h-9 flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => removeUser(user.id)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-300/12 px-3 py-1 text-xs font-semibold text-cyan-100"
                >
                  {user.email}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-white/8 bg-black/15 p-1">
              {searchingUsers ? <p className="px-2 py-2 text-xs text-white/40">Buscando…</p> : null}
              {!searchingUsers && userOptions.length === 0 ? (
                <p className="px-2 py-2 text-xs text-white/35">No hay correos para mostrar.</p>
              ) : null}
              {userOptions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addUser(user)}
                  className="block w-full cursor-pointer rounded px-2 py-2 text-left text-xs font-semibold text-white/65 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {user.email}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Acciones</p>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-white/8 bg-black/15 p-2">
              {actionOptions.map((option) => {
                const active = selectedActions.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleAction(option.value)}
                    className={[
                      'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                      active
                        ? 'border-violet-300/45 bg-violet-300/15 text-violet-100'
                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {items.length === 0 && !loading ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-surface-1 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-white/70">No hay movimientos con esos filtros.</p>
          <p className="mt-2 text-xs text-white/45">Probá sacar algún filtro para ampliar la búsqueda.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((entry) => (
            <HistorialRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loading ? <p className="py-3 text-center text-xs font-semibold text-white/45">Cargando más movimientos…</p> : null}
      {error ? <p className="py-3 text-center text-xs font-semibold text-rose-300">{error}</p> : null}
      {!hasMore && items.length > 0 ? (
        <p className="py-3 text-center text-xs font-semibold text-white/35">Ya viste todos los movimientos disponibles.</p>
      ) : null}
    </div>
  )
}

function HistorialRow({ entry }: { entry: HistorialEntry }) {
  const rendered = renderAuditEntry(entry.action, entry.detail)
  const Icon = rendered.icon
  const date = new Date(entry.createdAt)
  const absolute = ABSOLUTE_FORMATTER.format(date)
  const relative = timeAgo(date)

  return (
    <li className="flex gap-4 rounded-lg border border-white/5 bg-surface-1 px-4 py-4 transition-colors hover:border-white/10">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${rendered.iconClassName}`}>
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-white/80">{rendered.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-[0.18em] text-white/45">
          <time dateTime={entry.createdAt} title={absolute}>{relative}</time>
          {entry.userEmail ? (
            <>
              <span className="text-white/20">·</span>
              <span className="normal-case tracking-normal text-white/55">{entry.userEmail}</span>
            </>
          ) : null}
          {rendered.subtitle ? (
            <>
              <span className="text-white/20">·</span>
              <span className="normal-case tracking-normal text-white/55">{rendered.subtitle}</span>
            </>
          ) : null}
        </p>
      </div>
    </li>
  )
}
