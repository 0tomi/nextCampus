import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCareer, getCategoriasApunte, getPeriodos, getTiposEvento, getYearBySlug } from '@/lib/queries'
import { getYearColorClasses, getYearTone } from '@/lib/yearColors'
import { YearCalendarView } from '@/components/year/YearCalendarView'
import {
  buildYearCalendarEvents,
  buildYearDrawerYears,
  buildYearModalSubjects,
  buildYearSidebarItems,
} from '@/lib/domain/year-page-adapters'

export const metadata: Metadata = {
  title: 'Calendario del año | NextCampus',
  description: 'Consultá las fechas y actividades de las materias del año.',
}


export default async function YearCalendarPage({
  params,
}: {
  params: Promise<{ yearSlug: string }>
}) {
  const { yearSlug } = await params
  const [year, tiposEvento, career, categoriasDisponibles, periodos] = await Promise.all([
    getYearBySlug(yearSlug),
    getTiposEvento(),
    getCareer(),
    getCategoriasApunte(),
    getPeriodos(),
  ])

  if (!year) notFound()

  const colors = getYearColorClasses({ slug: year.slug, color: year.color })

  return (
    <YearCalendarView
      year={{
        id: year.id,
        slug: year.slug,
        nombre: year.nombre,
        career: year.career,
      }}
      allYears={buildYearDrawerYears(career)}
      sidebarItems={buildYearSidebarItems({
        badgeClassName: colors.badgeClassName,
        subjects: year.subjects,
        yearSlug: year.slug,
      })}
      tone={getYearTone({ slug: year.slug, color: year.color })}
      tiposEvento={tiposEvento}
      subjects={buildYearModalSubjects(year.subjects, categoriasDisponibles)}
      events={buildYearCalendarEvents(year.subjects)}
      periodos={periodos}
    />
  )
}
