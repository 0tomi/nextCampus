import { notFound } from 'next/navigation'
import { getCareer, getCategoriasApunte, getPeriodos, getTiposEvento, getYearBySlug } from '@/lib/queries'
import { todayKeyAR } from '@/lib/utils'
import {
  buildMobileYear,
  buildYearAdminData,
  buildYearCalendarEvents,
  buildYearDrawerYears,
  buildYearModalSubjects,
  buildYearOverviewEvents,
  buildYearUpcomingEvents,
  getYearDisplayIndex,
} from '@/lib/domain/year-page-adapters'

export async function getYearRouteContext(yearSlug: string) {
  const [year, tiposEvento, career, categoriasDisponibles, periodos] = await Promise.all([
    getYearBySlug(yearSlug),
    getTiposEvento(),
    getCareer(),
    getCategoriasApunte(),
    getPeriodos(),
  ])

  if (!year) notFound()

  const displayIndex = getYearDisplayIndex(career, year.id)

  return {
    year,
    tiposEvento,
    periodos,
    allYears: buildYearDrawerYears(career),
    nextEvents: buildYearUpcomingEvents(year.subjects, todayKeyAR()),
    overviewEvents: buildYearOverviewEvents(year.subjects),
    calendarEvents: buildYearCalendarEvents(year.subjects),
    mobileYear: buildMobileYear(year),
    modalSubjects: buildYearModalSubjects(year.subjects, categoriasDisponibles),
    adminYear: buildYearAdminData({ displayIndex, year }),
  }
}

export type YearRouteContext = Awaited<ReturnType<typeof getYearRouteContext>>
