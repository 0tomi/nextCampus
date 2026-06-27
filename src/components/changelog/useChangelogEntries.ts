'use client'

import { useCallback, useEffect, useReducer } from 'react'
import type { ChangelogEntryView } from './types'

interface ChangelogState {
  entries: ChangelogEntryView[]
  loading: boolean
  loadingMore: boolean
  error: string
  nextCursor: string | null
}

type ChangelogAction =
  | { type: 'load-start' }
  | { type: 'load-more-start' }
  | { type: 'load-success'; entries: ChangelogEntryView[]; nextCursor: string | null }
  | { type: 'load-more-success'; entries: ChangelogEntryView[]; nextCursor: string | null }
  | { type: 'load-error' }
  | { type: 'load-more-error' }
  | { type: 'mark-read'; entryIds: string[] }

function changelogReducer(state: ChangelogState, action: ChangelogAction): ChangelogState {
  switch (action.type) {
    case 'load-start':
      return { ...state, loading: true, error: '' }
    case 'load-more-start':
      return { ...state, loadingMore: true, error: '' }
    case 'load-success':
      return { entries: action.entries, loading: false, loadingMore: false, error: '', nextCursor: action.nextCursor }
    case 'load-more-success':
      return {
        entries: [...state.entries, ...action.entries],
        loading: false,
        loadingMore: false,
        error: '',
        nextCursor: action.nextCursor,
      }
    case 'load-error':
      return { ...state, loading: false, error: 'No pudimos cargar las novedades.' }
    case 'load-more-error':
      return { ...state, loadingMore: false, error: 'No pudimos cargar más novedades.' }
    case 'mark-read': {
      const readIds = new Set(action.entryIds)
      return {
        ...state,
        entries: state.entries.map((entry) =>
          readIds.has(entry.id) ? { ...entry, unread: false, readAt: new Date().toISOString() } : entry,
        ),
      }
    }
  }
}

interface UseChangelogEntriesOptions {
  enabled?: boolean
  initialEntries?: ChangelogEntryView[]
  initialNextCursor?: string | null
  limit?: number
}

interface ChangelogEntriesPayload {
  entries: ChangelogEntryView[]
  nextCursor: string | null
}

export function useChangelogEntries({
  enabled = true,
  initialEntries = [],
  initialNextCursor = null,
  limit,
}: UseChangelogEntriesOptions = {}) {
  const [state, dispatch] = useReducer(changelogReducer, {
    entries: initialEntries,
    loading: enabled && initialEntries.length === 0,
    loadingMore: false,
    error: '',
    nextCursor: initialNextCursor,
  })

  const refresh = useCallback(async () => {
    if (!enabled) return
    dispatch({ type: 'load-start' })
    try {
      const params = new URLSearchParams()
      if (limit) params.set('limit', String(limit))
      const query = params.toString()
      const response = await fetch(`/api/changelog/notifications${query ? `?${query}` : ''}`)
      if (!response.ok) throw new Error('No se pudieron cargar las novedades.')
      const payload = (await response.json()) as ChangelogEntriesPayload
      dispatch({ type: 'load-success', entries: payload.entries, nextCursor: payload.nextCursor })
    } catch {
      dispatch({ type: 'load-error' })
    }
  }, [enabled, limit])

  const loadMore = useCallback(async () => {
    if (!enabled || !state.nextCursor || state.loadingMore) return
    dispatch({ type: 'load-more-start' })
    try {
      const params = new URLSearchParams({ cursor: state.nextCursor })
      if (limit) params.set('limit', String(limit))
      const response = await fetch(`/api/changelog/notifications?${params.toString()}`)
      if (!response.ok) throw new Error('No se pudieron cargar más novedades.')
      const payload = (await response.json()) as ChangelogEntriesPayload
      dispatch({ type: 'load-more-success', entries: payload.entries, nextCursor: payload.nextCursor })
    } catch {
      dispatch({ type: 'load-more-error' })
    }
  }, [enabled, limit, state.loadingMore, state.nextCursor])

  const markRead = useCallback(async (entryIds: string[]) => {
    const uniqueIds = [...new Set(entryIds.filter(Boolean))]
    if (uniqueIds.length === 0) return
    dispatch({ type: 'mark-read', entryIds: uniqueIds })
    await fetch('/api/changelog/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryIds: uniqueIds }),
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!enabled || initialEntries.length > 0) return
    void refresh()
  }, [enabled, initialEntries.length, refresh])

  return { ...state, refresh, loadMore, markRead }
}
