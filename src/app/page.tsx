import Link from 'next/link'
import { Shield } from 'lucide-react'
import { ConfigButton } from '@/components/shell/ConfigButton'
import { getCareer, getUpcomingEventsCrossYear } from '@/lib/queries'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { AdminControls } from '@/components/admin/AdminControls'
import { AddYearButton } from '@/components/admin/HomeAdminOverlay'
import { MobileHome } from '@/components/mobile/home/MobileHome'
import { MobileShell } from '@/components/mobile/shell/MobileShell'
import { HomeYearsGrid } from '@/components/home/HomeYearsGrid'
import { HomeSidebar } from '@/components/home/HomeSidebar'
import { Mascot } from '@/components/ui/Mascot'
export const revalidate = 300

export default async function HomePage() {
  const [career, upcomingEventsRaw] = await Promise.all([
    getCareer(),
    getUpcomingEventsCrossYear(6),
  ])

  if (!career) {
    return (
      <>
        <div className="hidden lg:block">
          <DashboardShell
            topbar={
              <div className="flex items-center gap-2">
                <ConfigButton />
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              </div>
            }
            sidebar={
              <Sidebar
                eyebrow="CARRERA"
                title="Sin datos"
                secondaryEyebrow="AÑOS ACADÉMICOS"
                items={[]}
                emptyState="Todavía no hay años cargados."
              />
            }
          >
            <AnimateIn className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                Estado inicial
              </p>
              <div className="flex flex-col md:flex-row items-center gap-6 max-w-2xl rounded-md bg-surface-1 p-6">
                <div className="shrink-0">
                  <Mascot size={120} />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    No hay datos cargados todavía.
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-white/64">
                    Todavía no se cargó la información de la carrera. Cuando esté
                    lista, vas a ver acá los años y materias disponibles.
                  </p>
                </div>
              </div>
            </AnimateIn>
          </DashboardShell>
        </div>
        <div className="lg:hidden">
          <MobileShell title="NextCampus" drawerYears={[]} careerName="">
            <div className="px-[18px] pt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">CARRERA</p>
              <h1 className="mt-2 text-2xl font-black text-white">Todavía no hay datos.</h1>
              <p className="mt-3 text-sm text-white/55 leading-relaxed">Cuando esté listo vas a ver acá los años y materias de la carrera.</p>
            </div>
          </MobileShell>
        </div>
      </>
    )
  }

  const subjectYearSlugBySlug = new Map(
    career.years.flatMap((year) =>
      year.subjects.map((subject) => [subject.slug, year.slug] as const),
    ),
  )

  const upcomingEvents = upcomingEventsRaw.reduce<
    Array<{
      id: string
      titulo: string
      fecha: Date
      tipo: string
      subjectSlug: string
      subjectNombre: string
      yearSlug: string | null
    }>
  >((acc, event) => {
    const subjectSlug = event.agenda?.subject?.slug ?? ''

    if (!subjectSlug) {
      return acc
    }

    acc.push({
      id: event.id,
      titulo: event.titulo,
      fecha: event.fecha,
      tipo: event.tipoEvento.nombre,
      subjectSlug,
      subjectNombre: event.agenda?.subject?.nombre ?? '',
      yearSlug: subjectYearSlugBySlug.get(subjectSlug) ?? null,
    })

    return acc
  }, [])

  return (
    <>
      <div className="hidden lg:block">
        <DashboardShell
          topbar={
            <div className="flex items-center gap-2">
              <ConfigButton />
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            </div>
          }
          sidebar={
            <HomeSidebar careerName={career.nombre} years={career.years} />
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

            <section className="relative space-y-5">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
                  MATERIAS POR AÑO
                </p>
                <AdminControls requireGlobal>
                  <AddYearButton />
                </AdminControls>
              </div>

              <div className="pointer-events-none absolute -top-14 right-7 z-10 hidden 2xl:block">
                <Mascot size={86} />
              </div>

              <HomeYearsGrid years={career.years} />
            </section>
          </AnimateIn>
        </DashboardShell>
      </div>
      <div className="lg:hidden">
        <MobileHome career={career} upcomingEvents={upcomingEvents} />
      </div>
    </>
  )
}
