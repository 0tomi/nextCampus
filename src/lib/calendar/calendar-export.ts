import {
  isCommissionVisible,
  isSubjectVisible,
  isYearVisible,
  type UserPreferences,
} from '@/lib/preferences'
import { filterEventsByPreferredCommission } from '@/lib/commission-preferences'

export interface CalendarVisibilityEvent {
  fecha: string
  subjectSlug: string
  commissionId?: string | null
  commissionSlug?: string | null
}

export function filterYearCalendarEventsForUser<T extends CalendarVisibilityEvent>({
  events,
  yearSlug,
  prefs,
  preferredBySubject,
}: {
  events: readonly T[]
  yearSlug: string
  prefs: UserPreferences | null
  preferredBySubject: Readonly<Record<string, string | null>>
}): T[] {
  if (!isYearVisible(yearSlug, prefs)) return []

  const visibleEvents = events.filter((event) => {
    if (!isSubjectVisible(yearSlug, event.subjectSlug, prefs)) return false
    if (event.commissionId === null || event.commissionId === undefined) return true
    if (!event.commissionSlug) return false
    return isCommissionVisible(yearSlug, event.subjectSlug, event.commissionSlug, prefs)
  })

  return visibleEvents.filter((event) =>
    filterEventsByPreferredCommission(
      [event],
      preferredBySubject[event.subjectSlug] ?? null,
    ).length > 0,
  )
}

export function filterUpcomingCalendarEvents<T extends Pick<CalendarVisibilityEvent, 'fecha'>>(
  events: readonly T[],
  todayKey: string,
): T[] {
  return events.filter((event) => event.fecha >= todayKey)
}
