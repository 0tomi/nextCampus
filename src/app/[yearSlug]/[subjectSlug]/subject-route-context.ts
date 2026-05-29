import { notFound, redirect } from 'next/navigation'
import { getCareer, getSubjectPageBySlug, getTiposEvento } from '@/lib/queries'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'

type SubjectRouteContextInput = {
  yearSlug: string
  subjectSlug: string
  commissionSlug?: string
}

function sortEvents<T extends { fecha: string; hora: string | null }>(events: T[]) {
  // Por día y, dentro del día, por hora (los sin hora primero).
  return [...events].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''),
  )
}

export async function getSubjectRouteContext({
  yearSlug,
  subjectSlug,
  commissionSlug,
}: SubjectRouteContextInput) {
  const [subject, tiposEvento, career] = await Promise.all([
    getSubjectPageBySlug(subjectSlug),
    getTiposEvento(),
    getCareer(),
  ])

  if (!subject) notFound()

  const activeCommission = commissionSlug
    ? subject.commissions.find((commission) => commission.slug === commissionSlug) ?? null
    : null

  if (commissionSlug && !activeCommission) {
    notFound()
  }

  const canonicalHref = buildSubjectHref({
    yearSlug: subject.year.slug,
    subjectSlug: subject.slug,
    commissionSlug,
  })

  if (subject.year.slug !== yearSlug) {
    redirect(canonicalHref)
  }

  const generalEvents = subject.agendaGeneral?.eventos ?? []
  const allSubjectEvents = subject.agendas.flatMap((agenda) => agenda.eventos)
  const activeCommissionAgenda = activeCommission
    ? subject.agendas.find((agenda) => agenda.commissionId === activeCommission.id) ?? null
    : null
  const commissionEvents = activeCommissionAgenda?.eventos ?? []
  const visibleEvents = commissionSlug
    ? sortEvents([...generalEvents, ...commissionEvents])
    : sortEvents(allSubjectEvents)

  const allYears = (career?.years ?? []).map((year) => ({
    slug: year.slug,
    nombre: year.nombre,
    subjectsCount: year.subjects.length,
    orden: year.orden,
    subjects: year.subjects.map((s) => ({
      id: s.id,
      slug: s.slug,
      nombre: s.nombre,
    })),
  }))

  return {
    subject,
    tiposEvento,
    allYears,
    activeCommission,
    visibleEvents,
    agendaId: subject.agendaGeneral?.id ?? subject.agenda?.id ?? '',
  }
}

export type SubjectRouteContext = Awaited<
  ReturnType<typeof getSubjectRouteContext>
>
