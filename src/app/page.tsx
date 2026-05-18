import Link from 'next/link'
import { ArrowRight, BookOpen, GraduationCap, Shield } from 'lucide-react'
import { getCareer } from '@/lib/queries'
import { getYearColorClasses } from '@/lib/yearColors'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
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
          Lobby académico
        </span>
        <span className="block text-lg font-black tracking-tight text-white">
          NextCampus
        </span>
      </span>
    </Link>
  )
}

export default async function HomePage() {
  const career = await getCareer()

  if (!career) {
    return (
      <DashboardShell
        brand={<DashboardBrand />}
        topbar={
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Shield className="h-4 w-4" />
            Administración
          </Link>
        }
        sidebar={
          <Sidebar
            eyebrow="Mapa académico"
            title="Años"
            items={[]}
            emptyState="Todavía no hay años cargados."
          />
        }
      >
        <AnimateIn className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
            Estado inicial
          </p>
          <DarkCard className="max-w-2xl p-6">
            <h1 className="text-3xl font-black tracking-tight text-white">
              No hay datos cargados todavía.
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/64">
              Corré <code className="bg-white/5 px-1.5 py-0.5">pnpm db:migrate</code>{' '}
              y <code className="bg-white/5 px-1.5 py-0.5">pnpm db:seed</code>{' '}
              para poblar la carrera.
            </p>
          </DarkCard>
        </AnimateIn>
      </DashboardShell>
    )
  }

  const totalSubjects = career.years.reduce(
    (acc, year) => acc + year.subjects.length,
    0,
  )

  const sidebarItems = career.years.map((year, index) => {
    const colors = getYearColorClasses(year.slug)

    return {
      id: year.id,
      href: `#year-${year.slug}`,
      label: year.nombre,
      badge: String(index + 1).padStart(2, '0'),
      meta: `${year.subjects.length} materias`,
      badgeClassName: colors.badgeClassName,
    }
  })

  return (
    <DashboardShell
      brand={<DashboardBrand />}
      topbar={
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          <Shield className="h-4 w-4" />
          Administración
        </Link>
      }
      sidebar={
        <Sidebar
          eyebrow="Mapa académico"
          title="Años"
          items={sidebarItems}
        />
      }
      mainClassName="space-y-8"
    >
      <AnimateIn className="space-y-8">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
          <DarkCard className="p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
              Campus estudiantil
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              {career.nombre}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64 sm:text-base">
              {career.descripcion}
            </p>
          </DarkCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard
              icon={<GraduationCap className="h-5 w-5" />}
              label="Años activos"
              value={career.years.length}
              meta="Ruta completa"
              progress={100}
              chipClassName="bg-gradient-to-br from-amber-400/15 to-orange-500/15 text-amber-200"
              progressClassName="bg-gradient-to-r from-amber-400 to-orange-500"
            />
            <StatCard
              icon={<BookOpen className="h-5 w-5" />}
              label="Materias visibles"
              value={totalSubjects}
              meta="Acceso público"
              progress={career.years.length > 0 ? 100 : 0}
              chipClassName="bg-gradient-to-br from-cyan-400/15 to-blue-500/15 text-cyan-200"
              progressClassName="bg-gradient-to-r from-cyan-400 to-blue-500"
            />
          </div>
        </section>
      </AnimateIn>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
              Trayectos
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Explorá cada año de la carrera
            </h2>
          </div>
          <p className="max-w-xl text-sm text-white/48">
            Cada bloque mantiene el color estable por año y conserva las rutas
            públicas existentes.
          </p>
        </div>

        <div className="stagger-children grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {career.years.map((year, index) => {
            const colors = getYearColorClasses(year.slug)
            const visibleSubjects = year.subjects.slice(0, 6)
            const hiddenSubjects = year.subjects.length - visibleSubjects.length

            return (
              <DarkCard
                key={year.id}
                id={`year-${year.slug}`}
                variant="interactive"
                className="overflow-hidden"
              >
                <div
                  className={`h-1.5 ${colors.progressClassName}`}
                  aria-hidden="true"
                />
                <div className="space-y-5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">
                        Año {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                        {year.nombre}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex shrink-0 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${colors.chipClassName}`}
                    >
                      {year.subjects.length} materias
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {visibleSubjects.map((subject) => (
                      <li key={subject.id}>
                        <Link
                          href={`/materia/${subject.slug}`}
                          className="group flex items-center justify-between gap-3 border border-white/5 bg-white/[0.02] px-3 py-3 transition-colors hover:border-white/10 hover:bg-white/5"
                        >
                          <span className="min-w-0 flex-1 text-sm font-semibold text-white/82">
                            {subject.nombre}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-white/26 transition-transform group-hover:translate-x-0.5 group-hover:text-white/58" />
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {hiddenSubjects > 0 ? (
                    <p className="text-xs uppercase tracking-[0.18em] text-white/34">
                      + {hiddenSubjects} materias más en esta vista
                    </p>
                  ) : null}

                  <Link
                    href={`/year/${year.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white/72 transition-colors hover:text-white"
                  >
                    Ver tablero del año
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </DarkCard>
            )
          })}
        </div>
      </section>
    </DashboardShell>
  )
}
