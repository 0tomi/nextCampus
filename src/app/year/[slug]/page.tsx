import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, GraduationCap } from 'lucide-react'
import { getYearBySlug } from '@/lib/queries'
import { getYearColorClasses } from '@/lib/yearColors'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { EventCalendar } from '@/components/calendar/EventCalendar'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { DarkCard } from '@/components/ui/DarkCard'
import { StatCard } from '@/components/ui/StatCard'

export const revalidate = 300

function DashboardBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-black shadow-[0_0_30px_rgba(249,115,22,0.22)]">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
          Año académico
        </span>
        <span className="block text-lg font-black tracking-tight text-white">
          NextCampus
        </span>
      </span>
    </Link>
  )
}

export default async function YearPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const year = await getYearBySlug(slug)
  if (!year) notFound()

  const colors = getYearColorClasses(year.slug)
  const sidebarItems = year.subjects.map((subject, index) => ({
    id: subject.id,
    href: `/materia/${subject.slug}`,
    label: subject.nombre,
    badge: String(index + 1).padStart(2, '0'),
    meta: 'Materia',
    badgeClassName: colors.badgeClassName,
  }))

  return (
    <DashboardShell
      brand={<DashboardBrand />}
      topbar={
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">
          <Link href="/" className="transition-colors hover:text-white/72">
            {year.career.nombre}
          </Link>
          <span>/</span>
          <span className="text-white/72">{year.nombre}</span>
        </div>
      }
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
      <AnimateIn className="space-y-8">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <DarkCard className="p-6 sm:p-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition-colors hover:text-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al lobby
            </Link>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
              Trayecto académico
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {year.nombre}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64 sm:text-base">
              Entrá a cada materia desde el menú lateral o desde la grilla
              principal para seguir tu recorrido de cursada.
            </p>
          </DarkCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Materias visibles"
              value={year.subjects.length}
              meta="Recorrido anual"
              progress={100}
              chipClassName="bg-gradient-to-br from-violet-400/15 to-purple-500/15 text-violet-200"
              progressClassName={colors.progressClassName}
            />
            <DarkCard className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Estado
              </p>
              <div
                className={`mt-4 inline-flex border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${colors.chipClassName}`}
              >
                Vista del año activa
              </div>
              <p className="mt-4 text-sm leading-6 text-white/58">
                La agenda detallada se organiza dentro de cada materia para que
                encuentres fechas y entregas en contexto.
              </p>
            </DarkCard>
          </div>
        </section>
      </AnimateIn>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
              Agenda
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Calendario del año
            </h2>
          </div>
          <p className="max-w-xl text-sm text-white/48">
            Consultá las fechas importantes del año y entrá a cada materia para
            ver el detalle completo.
          </p>
        </div>

        <EventCalendar
          events={[]}
          emptyMessage="Todavía no hay eventos visibles a nivel año. Entrá a una materia para ver su agenda real."
        />
      </section>

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
          {year.subjects.map((subject, index) => (
            <Link key={subject.id} href={`/materia/${subject.slug}`}>
              <DarkCard variant="interactive" className="h-full p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
                      Materia {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                      {subject.nombre}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center bg-gradient-to-r px-3 text-xs font-black tracking-[0.16em] ${colors.progressClassName}`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-between text-sm font-semibold text-white/58">
                  <span>Abrir materia</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </DarkCard>
            </Link>
          ))}
        </div>
      </section>
    </DashboardShell>
  )
}
