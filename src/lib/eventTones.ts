import { slugify } from '@/lib/utils'

export type EventTone = 'red' | 'yellow' | 'emerald'

const EXAM_TYPES = new Set(['examen', 'parcial', 'final', 'recuperatorio'])
const ASSIGNMENT_TYPES = new Set(['trabajo-practico', 'tp', 'entrega'])

export function getEventTone(tipo?: string | null): EventTone | null {
  const normalized = slugify(tipo ?? '')
  if (!normalized) return null
  if (EXAM_TYPES.has(normalized)) return 'red'
  if (ASSIGNMENT_TYPES.has(normalized)) return 'yellow'
  return 'emerald'
}

export const EVENT_TONE_BADGE_CLASSES: Record<EventTone, string> = {
  red: 'border-red-500/20 bg-red-500/10 text-red-400',
  yellow: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
  emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
}

export const EVENT_TONE_CALENDAR_CLASSES: Record<EventTone, string> = {
  red: 'fc-event-tone-red',
  yellow: 'fc-event-tone-yellow',
  emerald: 'fc-event-tone-emerald',
}

export function getEventToneBadgeClass(tipo?: string | null): string {
  return EVENT_TONE_BADGE_CLASSES[getEventTone(tipo) ?? 'emerald']
}
