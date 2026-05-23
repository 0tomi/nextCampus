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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
