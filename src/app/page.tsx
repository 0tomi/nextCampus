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
              <div className="flex flex-col md:flex-row items-center gap-8 max-w-3xl rounded-xl border border-white/5 bg-surface-1 p-8 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
                <div className="shrink-0">
                  <Mascot size={150} />
                </div>
                <div className="space-y-3 text-center md:text-left">
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    No hay datos cargados todavía.
                  </h1>
                  <p className="text-sm leading-relaxed text-white/60">
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
            <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-surface-1 to-surface-2 p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              {/* Luces de fondo decorativas con los colores oficiales de UADER (Rojo y Azul) */}
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-600/10 blur-[60px]" />
              <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-blue-600/15 blur-[60px]" />
              
              <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="max-w-2xl space-y-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-400">
                    FCYT · UADER
                  </span>
                  <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                    {career.nombre}
                  </h1>
                  {career.descripcion && (
                    <p className="text-sm font-medium leading-relaxed text-white/50 md:text-base">
                      {career.descripcion}
                    </p>
                  )}
                </div>
                <div className="relative shrink-0 self-center md:self-auto">
                  <Mascot size={160} />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
                  MATERIAS POR AÑO
                </p>
                <AdminControls requireGlobal>
                  <AddYearButton />
                </AdminControls>
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
