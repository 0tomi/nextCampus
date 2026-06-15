import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { EditYearButton } from '@/components/admin/EditYearButton'
import { YearPageAdminOverlay } from '@/components/admin/YearPageAdminOverlay'
import { MobileYear } from '@/components/mobile/year/MobileYear'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { DarkCard } from '@/components/ui/DarkCard'
import { YearLatestApuntes } from '@/components/year/YearLatestApuntes'
import { YearOverviewEvents } from '@/components/year/YearOverviewEvents'
import { YearResourceLinks } from '@/components/year/YearResourceLinks'
import { buildYearSidebarItems } from '@/lib/domain/year-page-adapters'
import { formatDescription } from '@/lib/text'
import { getYearColorClasses } from '@/lib/yearColors'
import type { YearRouteContext } from './year-route-context'

export function YearRoutePage({
  adminYear,
  allYears,
  latestApuntes,
  mobileYear,
  modalSubjects,
  nextEvents,
  overviewEvents,
  periodos,
  tiposEvento,
  year,
}: YearRouteContext) {
  const colors = getYearColorClasses({ slug: year.slug, color: year.color })
  const sidebarItems = buildYearSidebarItems({
    badgeClassName: colors.badgeClassName,
    subjects: year.subjects,
    yearSlug: year.slug,
  })

  return (
    <>
      <YearDesktopView
        colors={colors}
        events={overviewEvents}
        latestApuntes={latestApuntes}
        modalSubjects={modalSubjects}
        nextEvents={nextEvents}
        periodos={periodos}
        sidebarItems={sidebarItems}
        tiposEvento={tiposEvento}
        year={year}
      />
      <YearMobileView
        allYears={allYears}
        careerName={year.career.nombre}
        latestApuntes={latestApuntes}
        mobileYear={mobileYear}
        nextEvents={nextEvents}
        tiposEvento={tiposEvento}
      />
      <YearPageAdminOverlay
        yearId={year.id}
        subjects={modalSubjects}
        tiposEvento={tiposEvento}
        year={adminYear}
      />
    </>
  )
}

type YearColorClasses = ReturnType<typeof getYearColorClasses>

type YearDesktopViewProps = Pick<
  YearRouteContext,
  'latestApuntes' | 'modalSubjects' | 'nextEvents' | 'periodos' | 'tiposEvento' | 'year'
> & {
  colors: YearColorClasses
  events: YearRouteContext['overviewEvents']
  sidebarItems: ReturnType<typeof buildYearSidebarItems>
}

function YearDesktopView({
  colors,
  events,
  latestApuntes,
  modalSubjects,
  nextEvents,
  periodos,
  sidebarItems,
  tiposEvento,
  year,
}: YearDesktopViewProps) {
  return (
    <div className="hidden lg:block" style={colors.style}>
      <DashboardShell
        topbar={<YearTopbar careerName={year.career.nombre} yearName={year.nombre} />}
        sidebar={
          <Sidebar
            eyebrow="Navegación"
            title={year.nombre}
            items={sidebarItems}
            emptyState="Este año todavía no tiene materias visibles."
          />
        }
        mainClassName="space-y-8"
      >
        <YearHero year={year} />

        <YearOverviewEvents
          year={{ id: year.id, slug: year.slug }}
          tiposEvento={tiposEvento}
          subjects={modalSubjects}
          events={events}
          nextEvents={nextEvents}
          periodos={periodos}
        />

        <YearLatestApuntes notes={latestApuntes} />

        <YearSubjectsGrid colors={colors} subjects={year.subjects} yearSlug={year.slug} />
      </DashboardShell>
    </div>
  )
}

function YearTopbar({ careerName, yearName }: { careerName: string; yearName: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">
      <Link href="/" className="transition-colors hover:text-white/72">
        {careerName}
      </Link>
      <span>/</span>
      <span className="text-white/72">{yearName}</span>
    </div>
  )
}

function YearHero({ year }: { year: YearRouteContext['year'] }) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
          Año académico
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
            {year.nombre}
          </h1>
          <EditYearButton />
        </div>
        {year.descripcion?.trim() ? (
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/64 sm:text-base">
            {formatDescription(year.descripcion.trim())}
          </p>
        ) : null}
      </div>

      <YearResourceLinks links={year.links} />
    </section>
  )
}

function YearSubjectsGrid({
  colors,
  subjects,
  yearSlug,
}: {
  colors: YearColorClasses
  subjects: YearRouteContext['year']['subjects']
  yearSlug: string
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Materias
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Accesos directos del año
          </h2>
        </div>
        <p className="max-w-xl text-sm text-white/48">
          Accesos rápidos para abrir cada materia y continuar estudiando.
        </p>
      </div>

      <div className="stagger-children grid gap-4 xl:grid-cols-2">
        {subjects.map((subject, index) => (
          <YearSubjectCard
            key={subject.id}
            colors={colors}
            index={index}
            subject={subject}
            yearSlug={yearSlug}
          />
        ))}
      </div>
    </section>
  )
}

function YearSubjectCard({
  colors,
  index,
  subject,
  yearSlug,
}: {
  colors: YearColorClasses
  index: number
  subject: YearRouteContext['year']['subjects'][number]
  yearSlug: string
}) {
  const badge = String(index + 1).padStart(2, '0')

  return (
    <Link href={buildSubjectHref({ yearSlug, subjectSlug: subject.slug })}>
      <DarkCard variant="interactive" className="h-full p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
              Materia {badge}
            </p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-white">
              {subject.nombre}
            </h3>
          </div>

          <span
            className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center bg-gradient-to-r px-3 text-xs font-black tracking-[0.16em] text-white ${colors.progressClassName}`}
          >
            {badge}
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm font-semibold text-white/58">
          <span>Abrir materia</span>
          <ArrowRight className="size-4" />
        </div>
      </DarkCard>
    </Link>
  )
}

function YearMobileView({
  allYears,
  careerName,
  latestApuntes,
  mobileYear,
  nextEvents,
  tiposEvento,
}: Pick<YearRouteContext, 'allYears' | 'latestApuntes' | 'mobileYear' | 'nextEvents' | 'tiposEvento'> & {
  careerName: string
}) {
  return (
    <div className="lg:hidden">
      <MobileYear
        year={mobileYear}
        allYears={allYears}
        latestApuntes={latestApuntes}
        nextEvents={nextEvents}
        careerName={careerName}
        tiposEvento={tiposEvento}
      />
    </div>
  )
}
