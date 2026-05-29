import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatAgendaTime(date: string | Date): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(new Date(date))

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  const dayPeriod = parts
    .find((part) => part.type === 'dayPeriod')
    ?.value.replace(/\s+/g, ' ')
    .trim()
    .toLowerCase() ?? ''

  return dayPeriod ? `${hour}:${minute} ${dayPeriod}` : `${hour}:${minute}`
}

// ---------------------------------------------------------------------------
// Fechas de evento
//
// Un evento tiene `fecha` como string "YYYY-MM-DD" (día calendario, sin hora) y
// `hora` como "HH:mm" | null (opcional). Una fecha calendario NO es un instante:
// `new Date("2026-05-29")` parsea como medianoche UTC y en AR (UTC-3) se ve como
// el día anterior. Por eso estas helpers nunca hacen `new Date(fechaKey)` directo.
// ---------------------------------------------------------------------------

/** Hoy en zona AR como clave "YYYY-MM-DD". Para comparar/filtrar sin líos de TZ. */
export function todayKeyAR(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

/** "YYYY-MM-DD" → Date a medianoche LOCAL, seguro para grilla y cálculos de calendario. */
export function eventDateToLocal(fechaKey: string): Date {
  const [year, month, day] = fechaKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** "29 de may de 2026" a partir de una clave "YYYY-MM-DD". */
export function formatEventDate(fechaKey: string): string {
  return formatDate(eventDateToLocal(fechaKey))
}

/** "29 de may de 2026 · 14:30" — omite la hora si el evento no la tiene. */
export function formatEventDateTime(fechaKey: string, hora: string | null): string {
  const base = formatEventDate(fechaKey)
  return hora ? `${base} · ${hora}` : base
}

import { slugify as slugifyCore } from './slug'

/**
 * Slug ligero para IDs/clases CSS donde el truncado y el fallback genérico
 * no aplican (ej: keys de eventos del calendario). Para slugs persistidos
 * en base usar directamente `@/lib/slug.slugify`.
 */
export function slugify(input: string): string {
  return slugifyCore(input, { maxLength: Infinity, fallback: '' })
}
