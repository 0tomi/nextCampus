import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
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
