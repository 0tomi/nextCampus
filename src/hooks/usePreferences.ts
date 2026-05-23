'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  readPreferences,
  writePreferences,
  clearPreferences,
  type UserPreferences,
} from '@/lib/preferences'

export function usePreferences() {
  const [prefs, setPrefsState] = useState<UserPreferences | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setPrefsState(readPreferences())
    setIsHydrated(true)
  }, [])

  const setPrefs = useCallback((next: UserPreferences) => {
    writePreferences(next)
    setPrefsState(next)
  }, [])

  const clear = useCallback(() => {
    clearPreferences()
    setPrefsState(null)
  }, [])

  return { prefs, isHydrated, setPrefs, clear }
}
