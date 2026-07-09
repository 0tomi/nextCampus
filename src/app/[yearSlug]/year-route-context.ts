import { notFound } from 'next/navigation'
import {
  getCareer,
  getCategoriasApunte,
  getLatestApuntesByYear,
  getPeriodos,
  getTiposEvento,
  getTodayKeyAR,
  getYearBySlug,
} from '@/lib/queries'
import {
  buildMobileYear,
  buildYearLatestApuntes,
  buildYearAdminData,
  buildYearCalendarEvents,
  buildYearDrawerYears,
  buildYearModalSubjects,
  buildYearOverviewEvents,
  buildYearUpcomingEvents,
  getYearDisplayIndex,
} from '@/lib/domain/year-page-adapters'

export async function getYearRouteContext(yearSlug: string) {
  const [year, tiposEvento, career, categoriasDisponibles, periodos, latestApuntesRaw, todayKey] = await Promise.all([
    getYearBySlug(yearSlug),
    getTiposEvento(),
    getCareer(),
    getCategoriasApunte(),
    getPeriodos(),
    getLatestApuntesByYear(yearSlug),
    getTodayKeyAR(),
  ])

  if (!year) notFound()

  const displayIndex = getYearDisplayIndex(career, year.id)

  return {
    year,
    tiposEvento,
    periodos,
    latestApuntes: buildYearLatestApuntes(latestApuntesRaw),
    allYears: buildYearDrawerYears(career),
    nextEvents: buildYearUpcomingEvents(year.subjects, todayKey),
    overviewEvents: buildYearOverviewEvents(year.subjects),
    calendarEvents: buildYearCalendarEvents(year.subjects),
    mobileYear: buildMobileYear(year),
    modalSubjects: buildYearModalSubjects(year.subjects, categoriasDisponibles),
    adminYear: buildYearAdminData({ displayIndex, year }),
  }
}

export type YearRouteContext = Awaited<ReturnType<typeof getYearRouteContext>>
