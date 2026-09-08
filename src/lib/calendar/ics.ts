export const ICS_FILENAME = 'nextcampus.ics'
export const ICS_MIME_TYPE = 'text/calendar;charset=utf-8'
const ACADEMIC_TIMEZONE = 'America/Argentina/Buenos_Aires'

export interface CalendarExportEvent {
  id: string
  titulo: string
  tituloOriginal?: string
  fecha: string
  hora: string | null
  materiaNombre: string
  descripcion?: string | null
  commissionId?: string | null
  commissionNombre?: string | null
}

export interface SerializeCalendarOptions {
  calendarName: string
  generatedAt: Date
}

function sanitizeIcsText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
}

function escapeIcsText(value: string): string {
  return sanitizeIcsText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValidTime(value: string | null): value is string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return false
  const [hour, minute] = value.split(':').map(Number)
  return hour < 24 && minute < 60
}

function formatDateValue(value: string): string {
  return value.replaceAll('-', '')
}

function nextDayValue(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + 1))
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`
}

function formatUtcDateTime(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  const hour = String(value.getUTCHours()).padStart(2, '0')
  const minute = String(value.getUTCMinutes()).padStart(2, '0')
  const second = String(value.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hour}${minute}${second}Z`
}

function formatLocalDateTime(fecha: string, hora: string): string {
  return `${formatDateValue(fecha)}T${hora.replace(':', '')}00`
}

function foldIcsLineByUtf8Bytes(line: string): string[] {
  const chunks: string[] = []
  let current = ''
  let limit = 75

  for (const character of line) {
    const next = current + character
    if (new TextEncoder().encode(next).length > limit && current) {
      chunks.push(current)
      current = ` ${character}`
      limit = 74
    } else {
      current = next
    }
  }

  if (current) chunks.push(current)
  return chunks
}

function buildSummary(event: CalendarExportEvent): string {
  const title = sanitizeIcsText(event.tituloOriginal || event.titulo)
  const subject = sanitizeIcsText(event.materiaNombre)
  const commission = sanitizeIcsText(event.commissionNombre)
  return [title, subject, commission].filter(Boolean).join(' · ')
}

function serializeEvent(event: CalendarExportEvent, generatedAt: string): string[] {
  if (!isValidCalendarDate(event.fecha)) return []
  if (event.hora !== null && !isValidTime(event.hora)) return []

  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(`nextcampus-${event.id}@calendar`)}`,
    `DTSTAMP:${generatedAt}`,
    event.hora === null
      ? `DTSTART;VALUE=DATE:${formatDateValue(event.fecha)}`
      : `DTSTART;TZID=${ACADEMIC_TIMEZONE}:${formatLocalDateTime(event.fecha, event.hora)}`,
  ]

  if (event.hora === null) {
    lines.push(`DTEND;VALUE=DATE:${nextDayValue(event.fecha)}`)
  }

  lines.push(`SUMMARY:${escapeIcsText(buildSummary(event))}`)
  const description = sanitizeIcsText(event.descripcion)
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
  lines.push('END:VEVENT')
  return lines
}

export function serializeCalendarToIcs(
  events: readonly CalendarExportEvent[],
  options: SerializeCalendarOptions,
): string {
  const generatedAt = formatUtcDateTime(options.generatedAt)
  const sortedEvents = [...events].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? '') || a.id.localeCompare(b.id),
  )
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//NextCampus//Calendario académico//ES',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName)}`,
    `X-WR-TIMEZONE:${ACADEMIC_TIMEZONE}`,
    'BEGIN:VTIMEZONE',
    `TZID:${ACADEMIC_TIMEZONE}`,
    `X-LIC-LOCATION:${ACADEMIC_TIMEZONE}`,
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:-03',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...sortedEvents.flatMap((event) => serializeEvent(event, generatedAt)),
    'END:VCALENDAR',
  ]

  return lines.flatMap(foldIcsLineByUtf8Bytes).join('\r\n') + '\r\n'
}
