export type EventDateTime = {
  fecha: string
  hora: string | null
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
