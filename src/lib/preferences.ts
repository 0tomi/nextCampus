export type UserPreferences = {
  hiddenYears: string[]
  hiddenSubjects: string[]
}

export const PREFERENCES_KEY = 'nextcampus_user_preferences_v1'

export const EMPTY_PREFERENCES: UserPreferences = {
  hiddenYears: [],
  hiddenSubjects: [],
}

function isValidPreferences(value: unknown): value is UserPreferences {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    Array.isArray(obj.hiddenYears) &&
    obj.hiddenYears.every((v) => typeof v === 'string') &&
    Array.isArray(obj.hiddenSubjects) &&
    obj.hiddenSubjects.every((v) => typeof v === 'string')
  )
}

export function readPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (!isValidPreferences(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function writePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
  } catch {}
}

export function clearPreferences(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFERENCES_KEY)
}

export function isYearVisible(yearSlug: string, prefs: UserPreferences | null): boolean {
  if (prefs === null) return true
  return !prefs.hiddenYears.includes(yearSlug)
}

export function isSubjectVisible(
  yearSlug: string,
  subjectSlug: string,
  prefs: UserPreferences | null,
): boolean {
  if (prefs === null) return true
  if (!isYearVisible(yearSlug, prefs)) return false
  return !prefs.hiddenSubjects.includes(subjectSlug)
}
