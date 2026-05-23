export type UserPreferences = {
  hiddenYears: string[]
  hiddenSubjects: string[]
  hiddenCommissions: string[]
}

export const PREFERENCES_KEY = 'nextcampus_user_preferences_v1'

export const EMPTY_PREFERENCES: UserPreferences = {
  hiddenYears: [],
  hiddenSubjects: [],
  hiddenCommissions: [],
}

let cachedRawPreferences: string | null | undefined
let cachedPreferences: UserPreferences | null = null

function isValidPreferences(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    Array.isArray(obj.hiddenYears) &&
    obj.hiddenYears.every((v) => typeof v === 'string') &&
      Array.isArray(obj.hiddenSubjects) &&
      obj.hiddenSubjects.every((v) => typeof v === 'string')
  )
}

function parsePreferences(raw: string | null): UserPreferences | null {
  if (raw === null) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isValidPreferences(parsed)) return null

    return {
      hiddenYears: parsed.hiddenYears as string[],
      hiddenSubjects: parsed.hiddenSubjects as string[],
      hiddenCommissions: Array.isArray(parsed.hiddenCommissions)
        ? (parsed.hiddenCommissions as unknown[]).filter((v): v is string => typeof v === 'string')
        : [],
    }
  } catch {
    return null
  }
}

export function readPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (raw === cachedRawPreferences) {
      return cachedPreferences
    }

    cachedRawPreferences = raw
    cachedPreferences = parsePreferences(raw)
    return cachedPreferences
  } catch {
    cachedRawPreferences = null
    cachedPreferences = null
    return null
  }
}

export function writePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return
  try {
    const raw = JSON.stringify(prefs)
    localStorage.setItem(PREFERENCES_KEY, raw)
    cachedRawPreferences = raw
    cachedPreferences = prefs
  } catch {}
}

export function clearPreferences(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFERENCES_KEY)
  cachedRawPreferences = null
  cachedPreferences = null
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

export function isCommissionVisible(
  yearSlug: string,
  subjectSlug: string,
  commissionSlug: string,
  prefs: UserPreferences | null,
): boolean {
  if (prefs === null) return true
  if (!isSubjectVisible(yearSlug, subjectSlug, prefs)) return false
  return !prefs.hiddenCommissions.includes(commissionSlug)
}
