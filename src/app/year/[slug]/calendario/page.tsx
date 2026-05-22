import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { getCareer, getYearBySlug, getTiposEvento } from '@/lib/queries'
import { getYearColorClasses, getYearTone } from '@/lib/yearColors'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { EventCalendarAdmin } from '@/components/calendar/EventCalendarAdmin'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { MobileCalendarLazy } from '@/components/mobile/calendar/MobileCalendarLazy'

export const revalidate = 300

function DashboardBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-black shadow-[0_0_30px_rgba(249,115,22,0.22)]">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
          Calendario
        </span>
        <span className="block text-lg font-black tracking-tight text-white">
          NextCampus
        </span>
      </span>
    </Link>
  )
}

export default async function YearCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [year, tiposEvento, career] = await Promise.all([
    getYearBySlug(slug),
    getTiposEvento(),
    getCareer(),
  ])
  if (!year) notFound()

  const colors = getYearColorClasses(year.slug)
  const tone = getYearTone(year.slug)

  const events = year.subjects
    .flatMap((s) =>
      (s.agenda?.eventos ?? []).map((e) => ({
        id: e.id,
        titulo: `${e.titulo} · ${s.nombre}`,
        fecha: e.fecha,
        tipo: e.tipoEvento.nombre,
        tipoId: e.tipoEventoId,
        subjectSlug: s.slug,
        subjectId: s.id,
        materiaNombre: s.nombre,
        descripcionHtml: e.descripcionHtml,
        tituloOriginal: e.titulo,
      })),
    )
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

  const allYears = (career?.years ?? []).map((y) => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjects.length,
  }))

  const drawerYears: MobileShellDrawerYear[] = allYears

  const sidebarItems = year.subjects.map((subject, index) => ({
    id: subject.id,
    href: `/materia/${subject.slug}`,
    label: subject.nombre,
    badge: String(index + 1).padStart(2, '0'),
    meta: 'Materia',
    badgeClassName: colors.badgeClassName,
  }))

  const modalSubjects = year.subjects
    .filter((s) => s.agenda !== null)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      nombre: s.nombre,
      agendaId: s.agenda!.id,
    }))

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <DashboardShell
          brand={<DashboardBrand />}
          topbar={
            <Link
              href={`/year/${year.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition-colors hover:text-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
              {year.nombre}
            </Link>
          }
          sidebar={
            <Sidebar
              eyebrow="Navegación"
              title={year.nombre}
              items={sidebarItems}
            />
          }
          mainClassName="space-y-8"
        >
          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
                Agenda
              </p>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Calendario completo · {year.nombre}
              </h1>
            </div>
            <EventCalendarAdmin
              events={events}
              emptyMessage="Todavía no hay eventos cargados en este año."
              className="year-calendar-expanded"
              dayMaxEvents={4}
              tiposEvento={tiposEvento}
              subjects={modalSubjects}
            />
          </section>
        </DashboardShell>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <MobileShell
          title="Calendario"
          subtitle={year.nombre}
          onBack={`/year/${year.slug}`}
          drawerYears={drawerYears}
          careerName={year.career.nombre}
          currentYearSlug={year.slug}
        >
          <div className="pt-4">
            <MobileCalendarLazy
              events={events.map((e) => ({
                id: e.id,
                fecha: e.fecha,
                titulo: e.titulo,
                tipo: e.tipo,
              }))}
              accent={tone}
              initialDate={events[0]?.fecha}
            />
          </div>
        </MobileShell>
      </div>
    </>
  )
}
