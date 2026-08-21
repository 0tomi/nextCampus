export type EventDateTime = {
  fecha: string
  hora: string | null
}

type EventWithCommissionMeta = {
  id: string
  titulo: string
  descripcion: string
  fecha: string
  hora: string | null
  tipoEvento: { nombre: string }
  tipoEventoId: string
  commissionId: string | null
  commission: { slug: string; nombre: string } | null
  createdByUserId: string | null
  createdByNombre: string | null
}

function compareEventDateTime(a: EventDateTime, b: EventDateTime) {
  return a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? '')
}

export function sortEventsByDateTime<T extends EventDateTime>(events: readonly T[]): T[] {
  return [...events].sort(compareEventDateTime)
}

export function isUpcomingEvent(event: EventDateTime, todayKey: string) {
  return event.fecha >= todayKey
}

export function getSubjectVisibleEvents<TEvent>(subject: {
  agendas: readonly { eventos: readonly TEvent[] }[]
}): TEvent[] {
  return subject.agendas.flatMap((agenda) => [...agenda.eventos])
}

type RelatedApunteLink = {
  id: string
  titulo: string
  slug: string
  subject: { slug: string; year: { slug: string } }
}

export function toSubjectEvents<T extends EventWithCommissionMeta & { apuntes: RelatedApunteLink[] }>(
  events: readonly T[],
) {
  return events.map((evento) => ({
    id: evento.id,
    titulo: evento.titulo,
    fecha: evento.fecha,
    hora: evento.hora,
    descripcion: evento.descripcion,
    tipoEvento: evento.tipoEvento,
    tipoEventoId: evento.tipoEventoId,
    commissionId: evento.commissionId,
    commissionSlug: evento.commission?.slug ?? null,
    commissionNombre: evento.commission?.nombre ?? null,
    createdByNombre: evento.createdByNombre ?? null,
    apuntes: evento.apuntes,
  }))
}

export function toMobileEvents<T extends EventWithCommissionMeta>(events: readonly T[]) {
  return events.map((evento) => ({
    id: evento.id,
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    fecha: evento.fecha,
    hora: evento.hora,
    tipoEventoId: evento.tipoEventoId,
    tipoEvento: evento.tipoEvento,
    commissionId: evento.commissionId,
    commissionSlug: evento.commission?.slug ?? null,
    commissionNombre: evento.commission?.nombre ?? null,
    createdByUserId: evento.createdByUserId,
    createdByNombre: evento.createdByNombre ?? null,
  }))
}

export function toEventSummaryItems<T extends { commissionId: string | null }>(
  events: readonly T[],
) {
  return events.map((evento) => ({ commissionId: evento.commissionId }))
}
