'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  readPreferences,
  writePreferences,
  clearPreferences,
  type UserPreferences,
} from '@/lib/preferences'

type Listener = () => void
const listeners = new Set<Listener>()
const subscribeToHydration = () => () => {}

function subscribe(listener: Listener) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === 'nextcampus_user_preferences_v1') {
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function emit() {
  listeners.forEach((l) => l())
}

function getSnapshot(): UserPreferences | null {
  return readPreferences()
}

function getServerSnapshot(): UserPreferences | null {
  return null
}

export function usePreferences() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )

  const setPrefs = useCallback((next: UserPreferences) => {
    writePreferences(next)
    emit()
  }, [])

  const clear = useCallback(() => {
    clearPreferences()
    emit()
  }, [])

  return { prefs, isHydrated, setPrefs, clear }
}
