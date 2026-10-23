'use client'

import type { ReactNode } from 'react'
import type { YearEventItem } from '@/lib/domain/year-page-adapters'
import { YearEventsContext } from './yearEvents'

export function YearEventsProvider({ events, todayKey, children }: {
  events: readonly YearEventItem[]
  todayKey: Promise<string>
  children: ReactNode
}) {
  return <YearEventsContext value={{ events, todayKey }}>{children}</YearEventsContext>
}
