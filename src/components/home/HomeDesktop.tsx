import { DashboardShell } from '@/components/shell/DashboardShell'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { Mascot } from '@/components/ui/Mascot'
import { HomeGlobalCalendar } from '@/components/home/HomeGlobalCalendar'
import { HomeLatestApuntes } from '@/components/home/HomeLatestApuntes'
import { HomeSidebar } from '@/components/home/HomeSidebar'
import { HomeYearsGrid } from '@/components/home/HomeYearsGrid'
import type { getCareer, getPeriodos } from '@/lib/queries'
import type { UserPreferences } from '@/lib/preferences'
import type {
  HomeCalendarPageEvent,
  HomeLatestApunteItem,
} from '@/lib/domain/home-page-adapters'
import { HomeTopbarActions } from './HomeTopbarActions'

type HomeCareer = NonNullable<Awaited<ReturnType<typeof getCareer>>>
type HomePeriodos = Awaited<ReturnType<typeof getPeriodos>>

export function HomeDesktop({
  career,
  calendarEvents,
  hasAnyNotes,
  initialPrefs,
  latestApuntes,
  periodos,
}: {
  career: HomeCareer
  calendarEvents: readonly HomeCalendarPageEvent[]
  hasAnyNotes: boolean
  initialPrefs: UserPreferences | null
  latestApuntes: readonly HomeLatestApunteItem[]
  periodos: HomePeriodos
}) {
  return (
    <div className="hidden lg:block">
      <DashboardShell
        topbar={<HomeTopbarActions />}
        sidebar={
          <HomeSidebar careerName={career.nombre} initialPrefs={initialPrefs} years={career.years} />
        }
        headerOverlay={
          <div className="absolute bottom-[-1px] left-[332px] z-10 hidden lg:block">
            <Mascot size={60} />
          </div>
        }
        mainClassName="space-y-12"
      >
        <AnimateIn className="space-y-10">
          <section className="relative px-1 pt-2">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {career.nombre}
              </h1>
              <p className="mt-4 text-base font-medium text-white/50">
                {career.descripcion}
              </p>
            </div>
          </section>

          <HomeGlobalCalendar
            initialPrefs={initialPrefs}
            events={calendarEvents}
            periodos={periodos}
          />

          <HomeLatestApuntes
            initialPrefs={initialPrefs}
            notes={latestApuntes}
            hasAnyNotes={hasAnyNotes}
          />

          <section className="space-y-5">
            <div className="px-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
                MATERIAS POR AÑO
              </p>
            </div>

            <HomeYearsGrid initialPrefs={initialPrefs} years={career.years} />
          </section>
        </AnimateIn>
      </DashboardShell>
    </div>
  )
}
