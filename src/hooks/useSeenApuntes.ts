'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { limitSeenApunteIds, parseSeenApunteIds } from '@/lib/seen-apuntes'

const STORAGE_KEY = 'nextCampus:seen-apuntes:v1'
const VIEWPORT_DELAY_MS = 1000

interface SeenApuntesState {
  ready: boolean
  seenIds: string[]
}

type SeenApuntesAction =
  | { type: 'hydrate'; seenIds: string[] }
  | { type: 'mark-seen'; id: string }

function seenApuntesReducer(state: SeenApuntesState, action: SeenApuntesAction): SeenApuntesState {
  switch (action.type) {
    case 'hydrate':
      return { ready: true, seenIds: limitSeenApunteIds(action.seenIds) }
    case 'mark-seen': {
      if (state.seenIds.includes(action.id)) return state
      return { ...state, seenIds: limitSeenApunteIds([...state.seenIds, action.id]) }
    }
  }
}

function readSeenIds(): string[] {
  return parseSeenApunteIds(window.localStorage.getItem(STORAGE_KEY))
}

function supportsDesktopHover(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function useSeenApuntes() {
  const [state, dispatch] = useReducer(seenApuntesReducer, { ready: false, seenIds: [] })
  const nodesRef = useRef(new Map<string, HTMLElement>())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const viewportTimersRef = useRef(new Map<string, number>())
  const hoverTimersRef = useRef(new Map<string, number>())
  const readyRef = useRef(false)
  const seenSetRef = useRef(new Set<string>())
  const seenSet = useMemo(() => new Set(state.seenIds), [state.seenIds])

  const markSeen = useCallback((id: string) => {
    dispatch({ type: 'mark-seen', id })
  }, [])

  const isNew = useCallback((id: string) => state.ready && !seenSet.has(id), [seenSet, state.ready])

  const registerNode = useCallback((id: string, node: HTMLElement | null) => {
    const previous = nodesRef.current.get(id)
    if (previous && previous !== node) observerRef.current?.unobserve(previous)

    if (node) {
      nodesRef.current.set(id, node)
      if (readyRef.current && !seenSetRef.current.has(id)) {
        observerRef.current?.observe(node)
      }
      return
    }
    if (previous) observerRef.current?.unobserve(previous)
    nodesRef.current.delete(id)
    const timer = viewportTimersRef.current.get(id)
    if (timer) window.clearTimeout(timer)
    viewportTimersRef.current.delete(id)
  }, [])

  const startHoverTimer = useCallback((id: string) => {
    if (!state.ready || seenSet.has(id) || !supportsDesktopHover()) return
    const existing = hoverTimersRef.current.get(id)
    if (existing) window.clearTimeout(existing)
    const timer = window.setTimeout(() => {
      hoverTimersRef.current.delete(id)
      markSeen(id)
    }, 800)
    hoverTimersRef.current.set(id, timer)
  }, [markSeen, seenSet, state.ready])

  const clearHoverTimer = useCallback((id: string) => {
    const timer = hoverTimersRef.current.get(id)
    if (timer) window.clearTimeout(timer)
    hoverTimersRef.current.delete(id)
  }, [])

  useEffect(() => {
    dispatch({ type: 'hydrate', seenIds: readSeenIds() })
  }, [])

  useEffect(() => {
    readyRef.current = state.ready
    seenSetRef.current = seenSet
  }, [seenSet, state.ready])

  useEffect(() => {
    if (!state.ready) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.seenIds))
  }, [state.ready, state.seenIds])

  useEffect(() => {
    if (!state.ready) return
    const viewportTimers = viewportTimersRef.current
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.getAttribute('data-apunte-id')
        if (!id || seenSet.has(id)) return

        if (entry.isIntersecting) {
          if (viewportTimersRef.current.has(id)) return
          const timer = window.setTimeout(() => {
            viewportTimersRef.current.delete(id)
            markSeen(id)
          }, VIEWPORT_DELAY_MS)
          viewportTimersRef.current.set(id, timer)
          return
        }

        const timer = viewportTimersRef.current.get(id)
        if (timer) window.clearTimeout(timer)
        viewportTimersRef.current.delete(id)
      })
    }, { threshold: 0.6 })

    observerRef.current = observer

    nodesRef.current.forEach((node, id) => {
      if (!seenSet.has(id)) observer.observe(node)
    })

    return () => {
      observer.disconnect()
      if (observerRef.current === observer) observerRef.current = null
      viewportTimers.forEach((timer) => window.clearTimeout(timer))
      viewportTimers.clear()
    }
  }, [markSeen, seenSet, state.ready])

  useEffect(() => {
    const hoverTimers = hoverTimersRef.current
    return () => {
      hoverTimers.forEach((timer) => window.clearTimeout(timer))
      hoverTimers.clear()
    }
  }, [])

  return { isNew, registerNode, startHoverTimer, clearHoverTimer }
}
