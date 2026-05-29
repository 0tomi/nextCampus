import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getYearBySlug, getTiposEvento, getCareer } from '@/lib/queries'
import { getYearColorClasses } from '@/lib/yearColors'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { DarkCard } from '@/components/ui/DarkCard'
import { YearPageAdminOverlay } from '@/components/admin/YearPageAdminOverlay'
import { MobileYear } from '@/components/mobile/year/MobileYear'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { YearOverviewEvents } from '@/components/year/YearOverviewEvents'
import { todayKeyAR } from '@/lib/utils'

export const revalidate = 300

export default async function YearPage({
  params,
}: {
  params: Promise<{ yearSlug: string }>
}) {
  const { yearSlug } = await params
  const [year, tiposEvento, career] = await Promise.all([
    getYearBySlug(yearSlug),
    getTiposEvento(),
    getCareer(),
  ])
  if (!year) notFound()

  const getSubjectVisibleEvents = (subject: (typeof year.subjects)[number]) =>
    subject.agendas.flatMap((agenda) => agenda.eventos)

  const allYears = (career?.years ?? []).map(y => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjects.length,
    orden: y.orden,
  }))

  const yearIndex = (career?.years ?? []).findIndex(y => y.id === year.id)

  // El corte "próximos eventos" depende del día actual del render.
  const todayKey = todayKeyAR()
  const nextEvents = year.subjects
    .flatMap(s => getSubjectVisibleEvents(s).map(e => ({
      id: e.id,
      titulo: e.titulo,
      fecha: e.fecha,
      hora: e.hora,
      tipo: e.tipoEvento.nombre,
      tipoId: e.tipoEventoId,
      subjectId: s.id,
      subjectSlug: s.slug,
      subjectNombre: s.nombre,
      materiaNombre: s.nombre,
      descripcionHtml: e.descripcionHtml,
      commissionId: e.commissionId,
      commissionSlug: e.commission?.slug ?? null,
      commissionNombre: e.commission?.nombre ?? null,
    })))
    .filter(e => e.fecha >= todayKey)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))

  const colors = getYearColorClasses(year.slug)
  const sidebarItems = year.subjects.map((subject, index) => ({
    id: subject.id,
    href: buildSubjectHref({ yearSlug: year.slug, subjectSlug: subject.slug }),
    label: subject.nombre,
    badge: String(index + 1).padStart(2, '0'),
    meta: 'Materia',
    badgeClassName: colors.badgeClassName,
  }))

  const events = year.subjects
    .flatMap((subject) => {
      const subjectEvents = getSubjectVisibleEvents(subject)
      return subjectEvents.map((evento) => ({
        id: evento.id,
        titulo: `${evento.titulo} (${subject.nombre})`,
        fecha: evento.fecha,
        hora: evento.hora,
        tipo: evento.tipoEvento.nombre,
        tipoId: evento.tipoEventoId,
        subjectSlug: subject.slug,
        subjectId: subject.id,
        materiaNombre: subject.nombre,
        descripcionHtml: evento.descripcionHtml,
        tituloOriginal: evento.titulo,
        commissionId: evento.commissionId,
        commissionSlug: evento.commission?.slug ?? null,
        commissionNombre: evento.commission?.nombre ?? null,
      }))
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))

  const mobileYear = {
    ...year,
    subjects: year.subjects.map((subject) => {
      const visibleEvents = getSubjectVisibleEvents(subject)

      return {
        ...subject,
        commissions: subject.commissions,
        agenda:
          visibleEvents.length > 0
            ? {
                id: subject.agenda?.id ?? subject.agendas[0]?.id ?? subject.id,
                eventos: visibleEvents.map((evento) => ({
                  ...evento,
                  commissionSlug: evento.commission?.slug ?? null,
                  commissionNombre: evento.commission?.nombre ?? null,
                })),
              }
            : null,
      }
    }),
  }

  const modalSubjects = year.subjects
    .filter((s) => s.agenda !== null)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      nombre: s.nombre,
      agendaId: s.agenda!.id,
      commissions: s.commissions,
    }))

  return (
    <>
      <div className="hidden lg:block">
        <DashboardShell
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
          <YearOverviewEvents
            year={{
              id: year.id,
              slug: year.slug,
            }}
            tiposEvento={tiposEvento}
            subjects={modalSubjects}
            events={events}
            nextEvents={nextEvents}
          />

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
                <Link
                  key={subject.id}
                  href={buildSubjectHref({
                    yearSlug: year.slug,
                    subjectSlug: subject.slug,
                  })}
                >
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
                        className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center bg-gradient-to-r px-3 text-xs font-black tracking-[0.16em] text-white ${colors.progressClassName}`}
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
      </div>
      <div className="lg:hidden">
        <MobileYear
          year={mobileYear}
          allYears={allYears}
          nextEvents={nextEvents}
          careerName={year.career.nombre}
          tiposEvento={tiposEvento}
        />
      </div>
      <YearPageAdminOverlay
        yearId={year.id}
        subjects={modalSubjects}
        tiposEvento={tiposEvento}
        year={{
          id: year.id,
          slug: year.slug,
          nombre: year.nombre,
          orden: yearIndex >= 0 ? yearIndex + 1 : 1,
        }}
      />
    </>
  )
}
