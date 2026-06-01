export type UserPreferences = {
  hiddenYears: string[]
  hiddenSubjects: string[]
  hiddenCommissions: string[]
}

export function getCommissionPreferenceKey(
  subjectSlug: string,
  commissionSlug: string,
): string {
  return `${subjectSlug}:${commissionSlug}`
}

export const PREFERENCES_KEY = 'nextcampus_user_preferences_v1'
const PREFERENCES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

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

const SLUG_MIGRATION_MAP: Record<string, string> = {
  'anio-1': 'primero',
  'anio-2': 'segundo',
  'anio-3': 'tercero',
  'anio-4': 'cuarto',
  'anio-5': 'quinto',
  'anio-6': 'sexto',
  'anio-7': 'septimo',
  'anio-8': 'octavo',
  'anio-9': 'noveno',
  'anio-10': 'decimo',
}

function parsePreferences(raw: string | null): UserPreferences | null {
  if (raw === null) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isValidPreferences(parsed)) return null

    return {
      hiddenYears: (parsed.hiddenYears as string[]).map(
        (slug) => SLUG_MIGRATION_MAP[slug] || slug
      ),
      hiddenSubjects: parsed.hiddenSubjects as string[],
      hiddenCommissions: Array.isArray(parsed.hiddenCommissions)
        ? (parsed.hiddenCommissions as unknown[]).filter((v): v is string => typeof v === 'string')
        : [],
    }
  } catch {
    return null
  }
}

export function readPreferencesFromCookie(raw: string | null): UserPreferences | null {
  if (!raw) return null

  try {
    return parsePreferences(decodeURIComponent(raw))
  } catch {
    return null
  }
}

function writePreferencesCookie(raw: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${PREFERENCES_KEY}=${encodeURIComponent(raw)}; Path=/; Max-Age=${PREFERENCES_COOKIE_MAX_AGE}; SameSite=Lax`
}

function clearPreferencesCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${PREFERENCES_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
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
    writePreferencesCookie(raw)
    cachedRawPreferences = raw
    cachedPreferences = prefs
  } catch {}
}

export function clearPreferences(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFERENCES_KEY)
  clearPreferencesCookie()
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

  const scopedKey = getCommissionPreferenceKey(subjectSlug, commissionSlug)
  return (
    !prefs.hiddenCommissions.includes(scopedKey) &&
    !prefs.hiddenCommissions.includes(commissionSlug)
  )
}
