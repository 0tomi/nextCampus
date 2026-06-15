export const MAX_SEEN_APUNTES = 100

export function limitSeenApunteIds(ids: string[]): string[] {
  const unique = [...new Set(ids.filter(Boolean))]
  while (unique.length > MAX_SEEN_APUNTES) unique.shift()
  return unique
}

export function parseSeenApunteIds(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}
