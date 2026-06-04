import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { HomeDesktop } from '@/components/home/HomeDesktop'
import { HomeEmptyState } from '@/components/home/HomeEmptyState'
import { MobileHome } from '@/components/mobile/home/MobileHome'
import {
  getCareer,
  getHomeCalendarEvents,
  getLatestApuntes,
  getPeriodos,
  getTiposEvento,
} from '@/lib/queries'
import { todayKeyAR } from '@/lib/utils'
import {
  buildHomeCalendarEvents,
  buildHomeLatestApuntes,
  buildHomeUpcomingEvents,
} from '@/lib/domain/home-page-adapters'
import { PREFERENCES_KEY, readPreferencesFromCookie } from '@/lib/preferences'

export const metadata: Metadata = {
  title: 'Inicio | NextCampus',
  description: 'Campus académico con calendario, apuntes y práctica por materia.',
}

export const revalidate = 300

export default async function HomePage() {
  const cookieStore = await cookies()
  const initialPrefs = readPreferencesFromCookie(
    cookieStore.get(PREFERENCES_KEY)?.value ?? null,
  )

  const [career, homeCalendarEventsRaw, tiposEvento, latestApuntesRaw, periodos] = await Promise.all([
    getCareer(),
    getHomeCalendarEvents(),
    getTiposEvento(),
    getLatestApuntes(),
    getPeriodos(),
  ])

  if (!career) return <HomeEmptyState />

  const todayKey = todayKeyAR()
  const upcomingEvents = buildHomeUpcomingEvents(homeCalendarEventsRaw, initialPrefs, todayKey)
  const homeCalendarEvents = buildHomeCalendarEvents(homeCalendarEventsRaw, initialPrefs)
  const latestApuntes = buildHomeLatestApuntes(latestApuntesRaw, initialPrefs)
  const hasAnyApuntes = latestApuntesRaw.length > 0

  return (
    <>
      <HomeDesktop
        career={career}
        initialPrefs={initialPrefs}
        calendarEvents={homeCalendarEvents}
        latestApuntes={latestApuntes}
        hasAnyNotes={hasAnyApuntes}
        periodos={periodos}
      />
      <div className="lg:hidden">
        <MobileHome
          career={career}
          initialPrefs={initialPrefs}
          upcomingEvents={upcomingEvents}
          tiposEvento={tiposEvento}
          calendarEvents={homeCalendarEvents}
          latestApuntes={latestApuntes}
          hasAnyNotes={hasAnyApuntes}
        />
      </div>
    </>
  )
}
