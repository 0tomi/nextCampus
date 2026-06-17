import type {
  getCareer,
  getCategoriasApunte,
  getLatestApuntesByYear,
  getYearBySlug,
} from '@/lib/queries'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import {
  getSubjectVisibleEvents,
  isUpcomingEvent,
  sortEventsByDateTime,
} from './event-adapters'

export type YearPageYear = NonNullable<Awaited<ReturnType<typeof getYearBySlug>>>
export type YearPageCareer = Awaited<ReturnType<typeof getCareer>>
export type YearPageCategorias = Awaited<ReturnType<typeof getCategoriasApunte>>
export type YearPageSubject = YearPageYear['subjects'][number]
export type YearPageEvent = YearPageSubject['agendas'][number]['eventos'][number]
export type RawYearLatestApunte = Awaited<ReturnType<typeof getLatestApuntesByYear>>[number]

export type YearLatestApunteItem = {
  id: string
  titulo: string
  slug: string
  createdAt: string
  updatedAt: string
  subjectSlug: string
  subjectNombre: string
  yearSlug: string
  yearNombre: string
}

export function buildYearDrawerYears(career: YearPageCareer) {
  return (career?.years ?? []).map((year) => ({
    slug: year.slug,
    nombre: year.nombre,
    color: year.color,
    subjectsCount: year.subjects.length,
    orden: year.orden,
    subjects: year.subjects.map((subject) => ({
      id: subject.id,
      slug: subject.slug,
      nombre: subject.nombre,
    })),
  }))
}

export function buildYearLatestApuntes(
  apuntes: readonly RawYearLatestApunte[],
): YearLatestApunteItem[] {
  return apuntes.map((apunte) => ({
    id: apunte.id,
    titulo: apunte.titulo,
    slug: apunte.slug,
    createdAt: apunte.createdAt,
    updatedAt: apunte.updatedAt,
    subjectSlug: apunte.subject.slug,
    subjectNombre: apunte.subject.nombre,
    yearSlug: apunte.subject.year.slug,
    yearNombre: apunte.subject.year.nombre,
  }))
}

export function getYearDisplayIndex(career: YearPageCareer, yearId: string) {
  const index = (career?.years ?? []).findIndex((year) => year.id === yearId)
  return index >= 0 ? index + 1 : 1
}

export function buildYearSidebarItems({
  badgeClassName,
  subjects,
  yearSlug,
}: {
  badgeClassName: string
  subjects: readonly Pick<YearPageSubject, 'id' | 'nombre' | 'slug'>[]
  yearSlug: string
}) {
  return subjects.map((subject, index) => ({
    id: subject.id,
    href: buildSubjectHref({ yearSlug, subjectSlug: subject.slug }),
    label: subject.nombre,
    badge: String(index + 1).padStart(2, '0'),
    meta: 'Materia',
    badgeClassName,
  }))
}

export function buildYearModalSubjects(
  subjects: readonly YearPageSubject[],
  categoriasDisponibles: YearPageCategorias,
) {
  return subjects.flatMap((subject) => {
    if (!subject.agenda) return []

    return [
      {
        id: subject.id,
        slug: subject.slug,
        nombre: subject.nombre,
        agendaId: subject.agenda.id,
        commissions: subject.commissions,
        categoriasDisponibles,
      },
    ]
  })
}

function toYearOverviewEvent({
  event,
  subject,
  title,
}: {
  event: YearPageEvent
  subject: YearPageSubject
  title: string
}) {
  return {
    id: event.id,
    titulo: title,
    fecha: event.fecha,
    hora: event.hora,
    tipo: event.tipoEvento.nombre,
    tipoId: event.tipoEventoId,
    subjectSlug: subject.slug,
    subjectId: subject.id,
    materiaNombre: subject.nombre,
    descripcionHtml: event.descripcionHtml,
    tituloOriginal: event.titulo,
    commissionId: event.commissionId,
    commissionSlug: event.commission?.slug ?? null,
    commissionNombre: event.commission?.nombre ?? null,
    createdByUserId: event.createdByUserId,
    apuntes: event.apuntes,
  }
}

export function buildYearOverviewEvents(subjects: readonly YearPageSubject[]) {
  return sortEventsByDateTime(
    subjects.flatMap((subject) =>
      getSubjectVisibleEvents(subject).map((event) =>
        toYearOverviewEvent({
          event,
          subject,
          title: `${event.titulo} (${subject.nombre})`,
        }),
      ),
    ),
  )
}

export function buildYearCalendarEvents(subjects: readonly YearPageSubject[]) {
  return sortEventsByDateTime(
    subjects.flatMap((subject) =>
      getSubjectVisibleEvents(subject).map((event) =>
        toYearOverviewEvent({
          event,
          subject,
          title: `${event.titulo} · ${subject.nombre}`,
        }),
      ),
    ),
  )
}

export function buildYearUpcomingEvents(
  subjects: readonly YearPageSubject[],
  todayKey: string,
) {
  return sortEventsByDateTime(
    subjects.flatMap((subject) =>
      getSubjectVisibleEvents(subject).flatMap((event) => {
        if (!isUpcomingEvent(event, todayKey)) return []

        return [
          {
            id: event.id,
            titulo: event.titulo,
            fecha: event.fecha,
            hora: event.hora,
            tipo: event.tipoEvento.nombre,
            tipoId: event.tipoEventoId,
            subjectId: subject.id,
            subjectSlug: subject.slug,
            subjectNombre: subject.nombre,
            materiaNombre: subject.nombre,
            descripcionHtml: event.descripcionHtml,
            commissionId: event.commissionId,
            commissionSlug: event.commission?.slug ?? null,
            commissionNombre: event.commission?.nombre ?? null,
            createdByUserId: event.createdByUserId,
            apuntes: event.apuntes,
          },
        ]
      }),
    ),
  )
}

export function buildMobileYear(year: YearPageYear) {
  return {
    ...year,
    subjects: year.subjects.map((subject) => {
      const visibleEvents = getSubjectVisibleEvents(subject)

      return {
        ...subject,
        commissions: subject.commissions,
        agenda:
          visibleEvents.length > 0
            ? {
                id: subject.agenda?.id ?? subject.agendas[0]?.id ?? subject.id,
                eventos: visibleEvents.map((event) => ({
                  ...event,
                  commissionSlug: event.commission?.slug ?? null,
                  commissionNombre: event.commission?.nombre ?? null,
                })),
              }
            : null,
      }
    }),
  }
}

export function buildYearAdminData({
  displayIndex,
  year,
}: {
  displayIndex: number
  year: YearPageYear
}) {
  return {
    id: year.id,
    slug: year.slug,
    nombre: year.nombre,
    descripcion: year.descripcion,
    links: year.links,
    orden: displayIndex,
    color: year.color,
  }
}
