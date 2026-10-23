'use client'

import { createContext, use, useEffect, useMemo, useState } from 'react'
import type { YearEventItem } from '@/lib/domain/year-page-adapters'
import { startArgentinaDayClock } from './argentinaDayClock'

export const YearEventsContext = createContext<{
  events: readonly YearEventItem[]
  todayKey: Promise<string>
} | null>(null)

export function useYearEvents() {
  const value = use(YearEventsContext)
  if (!value) throw new Error('Year events require YearEventsProvider')
  return value
}

// Only upcoming-list consumers read the request-time promise. The provider and
// date-independent calendar/hero remain part of the prerendered shell.
export function useUpcomingYearEvents() {
  const { events, todayKey } = useYearEvents()
  const initialDay = use(todayKey)
  const [day, setDay] = useState(initialDay)
  useEffect(() => startArgentinaDayClock(setDay), [])
  return useMemo(() => events.filter((event) => event.fecha >= day), [events, day])
}
