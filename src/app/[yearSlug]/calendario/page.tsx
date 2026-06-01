import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCareer, getYearBySlug, getTiposEvento, getCategoriasApunte } from '@/lib/queries'
import { getYearColorClasses, getYearTone } from '@/lib/yearColors'
import { type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { YearCalendarView } from '@/components/year/YearCalendarView'

export const metadata: Metadata = {
  title: 'Calendario del año | NextCampus',
  description: 'Consultá las fechas y actividades de las materias del año.',
}

export const revalidate = 300

export default async function YearCalendarPage({
  params,
}: {
  params: Promise<{ yearSlug: string }>
}) {
  const { yearSlug } = await params
  const [year, tiposEvento, career, categoriasDisponibles] = await Promise.all([
    getYearBySlug(yearSlug),
    getTiposEvento(),
    getCareer(),
    getCategoriasApunte(),
  ])
  if (!year) notFound()

  const colors = getYearColorClasses({ slug: year.slug, color: year.color })
  const tone = getYearTone({ slug: year.slug, color: year.color })
  const getSubjectVisibleEvents = (subject: (typeof year.subjects)[number]) =>
    subject.agendas.flatMap((agenda) => agenda.eventos)

  const events = year.subjects
    .flatMap((s) =>
      getSubjectVisibleEvents(s).map((e) => ({
        id: e.id,
        titulo: `${e.titulo} · ${s.nombre}`,
        fecha: e.fecha,
        hora: e.hora,
        tipo: e.tipoEvento.nombre,
        tipoId: e.tipoEventoId,
        subjectSlug: s.slug,
        subjectId: s.id,
        materiaNombre: s.nombre,
        descripcionHtml: e.descripcionHtml,
        tituloOriginal: e.titulo,
        commissionId: e.commissionId,
        commissionSlug: e.commission?.slug ?? null,
        commissionNombre: e.commission?.nombre ?? null,
        createdByUserId: e.createdByUserId,
        apuntes: e.apuntes,
      })),
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))

  const allYears = (career?.years ?? []).map((y) => ({
    slug: y.slug,
    nombre: y.nombre,
    color: y.color,
    subjectsCount: y.subjects.length,
    orden: y.orden,
    subjects: y.subjects.map(s => ({
      id: s.id,
      slug: s.slug,
      nombre: s.nombre,
    })),
  }))

  const drawerYears: MobileShellDrawerYear[] = allYears

  const sidebarItems = year.subjects.map((subject, index) => ({
    id: subject.id,
    href: buildSubjectHref({ yearSlug: year.slug, subjectSlug: subject.slug }),
    label: subject.nombre,
    badge: String(index + 1).padStart(2, '0'),
    meta: 'Materia',
    badgeClassName: colors.badgeClassName,
  }))

  const modalSubjects = year.subjects
    .filter((s) => s.agenda !== null)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      nombre: s.nombre,
      agendaId: s.agenda!.id,
      commissions: s.commissions,
      categoriasDisponibles,
    }))

  return (
    <YearCalendarView
      year={{
        id: year.id,
        slug: year.slug,
        nombre: year.nombre,
        career: year.career,
      }}
      allYears={drawerYears}
      sidebarItems={sidebarItems}
      tone={tone}
      tiposEvento={tiposEvento}
      subjects={modalSubjects}
      events={events}
    />
  )
}
