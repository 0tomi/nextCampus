import type { getHomeCalendarEvents, getLatestApuntes } from '@/lib/queries'
import {
  isCommissionVisible,
  isSubjectVisible,
  type UserPreferences,
} from '@/lib/preferences'
import { isUpcomingEvent, sortEventsByDateTime } from './event-adapters'

export type RawHomeCalendarEvent = Awaited<ReturnType<typeof getHomeCalendarEvents>>[number]
export type RawHomeLatestApunte = Awaited<ReturnType<typeof getLatestApuntes>>[number]

export type HomeUpcomingEvent = {
  id: string
  titulo: string
  descripcionHtml: string | null
  fecha: string
  hora: string | null
  tipo: string
  tipoId: string
  subjectId: string
  subjectSlug: string
  subjectNombre: string
  yearId: string | null
  yearSlug: string | null
  commissionId: string | null
  commissionSlug: string | null
  commissionNombre: string | null
  apuntes: RawHomeCalendarEvent['apuntes']
}

export type HomeCalendarPageEvent = {
  id: string
  titulo: string
  fecha: string
  hora: string | null
  tipo: string
  tipoId: string
  yearNombre: string
  yearSlug: string
  subjectSlug: string
  subjectId: string
  materiaNombre: string
  descripcionHtml: string | null
  commissionSlug: string | null
  commissionNombre: string | null
  agendaId: string
  yearId: string
  apuntes: RawHomeCalendarEvent['apuntes']
}

export type HomeLatestApunteItem = {
  id: string
  titulo: string
  slug: string
  createdAt: string
  subjectSlug: string
  subjectNombre: string
  yearSlug: string
  yearNombre: string
}

export function isHomeEventVisibleForPrefs(
  event: {
    yearSlug: string | null
    subjectSlug: string
    commissionSlug: string | null
  },
  prefs: UserPreferences | null,
) {
  if (!prefs || !event.yearSlug) return false
  if (!isSubjectVisible(event.yearSlug, event.subjectSlug, prefs)) return false
  if (!event.commissionSlug) return true

  return isCommissionVisible(
    event.yearSlug,
    event.subjectSlug,
    event.commissionSlug,
    prefs,
  )
}

export function buildHomeUpcomingEvents(
  events: readonly RawHomeCalendarEvent[],
  prefs: UserPreferences | null,
  todayKey: string,
  limit = 50,
): HomeUpcomingEvent[] {
  const visibleEvents = events.reduce<HomeUpcomingEvent[]>((acc, event) => {
    if (!isUpcomingEvent(event, todayKey)) return acc

    const subject = event.agenda?.subject
    const year = subject?.year
    if (!subject || !year) return acc

    const mappedEvent: HomeUpcomingEvent = {
      id: event.id,
      titulo: event.titulo,
      descripcionHtml: event.descripcionHtml,
      fecha: event.fecha,
      hora: event.hora,
      tipo: event.tipoEvento.nombre,
      tipoId: event.tipoEventoId,
      subjectId: subject.id,
      subjectSlug: subject.slug,
      subjectNombre: subject.nombre,
      yearId: year.id,
      yearSlug: year.slug,
      commissionId: event.agenda.commissionId,
      commissionSlug: event.agenda.commission?.slug ?? null,
      commissionNombre: event.agenda.commission?.nombre ?? null,
      apuntes: event.apuntes,
    }

    if (isHomeEventVisibleForPrefs(mappedEvent, prefs)) {
      acc.push(mappedEvent)
    }

    return acc
  }, [])

  return sortEventsByDateTime(visibleEvents).slice(0, limit)
}

export function buildHomeCalendarEvents(
  events: readonly RawHomeCalendarEvent[],
  prefs: UserPreferences | null,
): HomeCalendarPageEvent[] {
  return events.reduce<HomeCalendarPageEvent[]>((acc, event) => {
    const subject = event.agenda?.subject
    const year = subject?.year
    if (!subject || !year) return acc

    const mappedEvent: HomeCalendarPageEvent = {
      id: event.id,
      titulo: event.titulo,
      fecha: event.fecha,
      hora: event.hora,
      tipo: event.tipoEvento.nombre,
      tipoId: event.tipoEventoId,
      yearNombre: year.nombre,
      yearSlug: year.slug,
      subjectSlug: subject.slug,
      subjectId: subject.id,
      materiaNombre: subject.nombre,
      descripcionHtml: event.descripcionHtml,
      commissionSlug: event.agenda.commission?.slug ?? null,
      commissionNombre: event.agenda.commission?.nombre ?? null,
      agendaId: event.agenda.id,
      yearId: year.id,
      apuntes: event.apuntes,
    }

    if (isHomeEventVisibleForPrefs(mappedEvent, prefs)) {
      acc.push(mappedEvent)
    }

    return acc
  }, [])
}

export function buildHomeLatestApuntes(
  apuntes: readonly RawHomeLatestApunte[],
  prefs: UserPreferences | null,
  limit = 6,
): HomeLatestApunteItem[] {
  if (!prefs) return []

  return apuntes.reduce<HomeLatestApunteItem[]>((acc, apunte) => {
    if (acc.length >= limit) return acc

    const mappedApunte: HomeLatestApunteItem = {
      id: apunte.id,
      titulo: apunte.titulo,
      slug: apunte.slug,
      createdAt: apunte.createdAt.toISOString(),
      subjectSlug: apunte.subject.slug,
      subjectNombre: apunte.subject.nombre,
      yearSlug: apunte.subject.year.slug,
      yearNombre: apunte.subject.year.nombre,
    }

    if (isSubjectVisible(mappedApunte.yearSlug, mappedApunte.subjectSlug, prefs)) {
      acc.push(mappedApunte)
    }

    return acc
  }, [])
}
