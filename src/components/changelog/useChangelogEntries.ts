'use client'

import { useCallback, useEffect, useReducer } from 'react'
import type { ChangelogEntryView } from './types'

interface ChangelogState {
  entries: ChangelogEntryView[]
  loading: boolean
  error: string
}

type ChangelogAction =
  | { type: 'load-start' }
  | { type: 'load-success'; entries: ChangelogEntryView[] }
  | { type: 'load-error' }
  | { type: 'mark-read'; entryIds: string[] }

function changelogReducer(state: ChangelogState, action: ChangelogAction): ChangelogState {
  switch (action.type) {
    case 'load-start':
      return { ...state, loading: true, error: '' }
    case 'load-success':
      return { entries: action.entries, loading: false, error: '' }
    case 'load-error':
      return { ...state, loading: false, error: 'No pudimos cargar las novedades.' }
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
}

export function useChangelogEntries({
  enabled = true,
  initialEntries = [],
}: UseChangelogEntriesOptions = {}) {
  const [state, dispatch] = useReducer(changelogReducer, {
    entries: initialEntries,
    loading: enabled && initialEntries.length === 0,
    error: '',
  })

  const refresh = useCallback(async () => {
    if (!enabled) return
    dispatch({ type: 'load-start' })
    try {
      const response = await fetch('/api/changelog/notifications')
      if (!response.ok) throw new Error('No se pudieron cargar las novedades.')
      const payload = (await response.json()) as { entries: ChangelogEntryView[] }
      dispatch({ type: 'load-success', entries: payload.entries })
    } catch {
      dispatch({ type: 'load-error' })
    }
  }, [enabled])

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

  return { ...state, refresh, markRead }
}
