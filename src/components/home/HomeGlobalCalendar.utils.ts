import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import {
  isCommissionVisible,
  isSubjectVisible,
  type UserPreferences,
} from '@/lib/preferences'
import type { HomeGlobalCalendarEvent } from './HomeGlobalCalendar'

export function buildHomeCalendarEventHref(
  event: Pick<HomeGlobalCalendarEvent, 'yearSlug' | 'subjectSlug' | 'commissionSlug'>,
) {
  return buildSubjectHref({
    yearSlug: event.yearSlug,
    subjectSlug: event.subjectSlug,
    commissionSlug: event.commissionSlug,
  })
}

export function isHomeCalendarEventVisible(
  event: Pick<HomeGlobalCalendarEvent, 'yearSlug' | 'subjectSlug' | 'commissionSlug'>,
  prefs: UserPreferences | null,
) {
  if (!isSubjectVisible(event.yearSlug, event.subjectSlug, prefs)) {
    return false
  }

  if (!event.commissionSlug) {
    return true
  }

  return isCommissionVisible(
    event.yearSlug,
    event.subjectSlug,
    event.commissionSlug,
    prefs,
  )
}
