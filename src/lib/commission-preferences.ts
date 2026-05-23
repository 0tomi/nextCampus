export interface CommissionOption {
  id: string
  slug: string
  nombre: string
}

export interface CommissionAwareEvent {
  commissionId?: string | null
}

export const ALL_COMMISSIONS_VALUE = '__all_commissions__'
export const PREFERRED_COMMISSION_EVENT = 'nextcampus:preferred-commission-updated'

export function getPreferredCommissionStorageKey(subjectSlug: string) {
  return `nextcampus:preferred-commission:subject:${subjectSlug}`
}

export function normalizePreferredCommissionId(value: string | null | undefined) {
  if (!value || value === ALL_COMMISSIONS_VALUE) {
    return null
  }

  return value
}

export function isValidCommissionId(
  commissionId: string | null,
  commissions: readonly CommissionOption[],
) {
  if (!commissionId) return true

  return commissions.some((commission) => commission.id === commissionId)
}

export function readPreferredCommissionId(
  subjectSlug: string,
  commissions: readonly CommissionOption[],
) {
  if (typeof window === 'undefined') {
    return null
  }

  const storedValue = normalizePreferredCommissionId(
    window.localStorage.getItem(getPreferredCommissionStorageKey(subjectSlug)),
  )

  return isValidCommissionId(storedValue, commissions) ? storedValue : null
}

export function writePreferredCommissionId(
  subjectSlug: string,
  commissionId: string | null,
) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedCommissionId = normalizePreferredCommissionId(commissionId)
  const storageKey = getPreferredCommissionStorageKey(subjectSlug)

  if (!normalizedCommissionId) {
    window.localStorage.removeItem(storageKey)
    window.dispatchEvent(new Event(PREFERRED_COMMISSION_EVENT))
    return
  }

  window.localStorage.setItem(storageKey, normalizedCommissionId)
  window.dispatchEvent(new Event(PREFERRED_COMMISSION_EVENT))
}

export function subscribeToPreferredCommissionChanges(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleChange = () => callback()

  window.addEventListener('storage', handleChange)
  window.addEventListener(PREFERRED_COMMISSION_EVENT, handleChange)

  return () => {
    window.removeEventListener('storage', handleChange)
    window.removeEventListener(PREFERRED_COMMISSION_EVENT, handleChange)
  }
}

export function shouldIncludeEventForCommissionPreference(
  event: CommissionAwareEvent,
  preferredCommissionId: string | null,
) {
  if (!preferredCommissionId) {
    return true
  }

  return event.commissionId === null || event.commissionId === preferredCommissionId
}

export function filterEventsByPreferredCommission<T extends CommissionAwareEvent>(
  events: readonly T[],
  preferredCommissionId: string | null,
) {
  return events.filter((event) =>
    shouldIncludeEventForCommissionPreference(event, preferredCommissionId),
  )
}
