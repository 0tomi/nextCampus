import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Plus } from 'lucide-react'
import { getYearBySlug, getTiposEvento, getCareer } from '@/lib/queries'
import { getYearColorClasses } from '@/lib/yearColors'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { EventCalendarAdmin } from '@/components/calendar/EventCalendarAdmin'
import { DarkCard } from '@/components/ui/DarkCard'
import { AdminControls } from '@/components/admin/AdminControls'
import { AdminTriggerButton, DeleteEventoButton } from '@/components/admin/SubjectPageAdminOverlay'
import { YearPageAdminOverlay } from '@/components/admin/YearPageAdminOverlay'
import { MobileYear } from '@/components/mobile/year/MobileYear'
import { formatDateTime } from '@/lib/utils'
import { sanitizeRichHtml } from '@/lib/sanitize'

export const revalidate = 300

export default async function YearPage({
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

  const allYears = (career?.years ?? []).map(y => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjects.length,
  }))

  const yearIndex = (career?.years ?? []).findIndex(y => y.id === year.id)

  // eslint-disable-next-line react-hooks/purity -- el corte "próximos eventos" depende del momento actual del render
  const now = Date.now()
  const nextEvents = year.subjects
    .flatMap(s => (s.agenda?.eventos ?? []).map(e => ({
      id: e.id,
      titulo: e.titulo,
      fecha: e.fecha,
      tipo: e.tipoEvento.nombre,
      subjectSlug: s.slug,
      subjectNombre: s.nombre,
      descripcionHtml: e.descripcionHtml,
    })))
    .filter(e => new Date(e.fecha).getTime() >= now)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 5)

  const colors = getYearColorClasses(year.slug)
  const sidebarItems = year.subjects.map((subject, index) => ({
    id: subject.id,
    href: `/materia/${subject.slug}`,
    label: subject.nombre,
    badge: String(index + 1).padStart(2, '0'),
    meta: 'Materia',
    badgeClassName: colors.badgeClassName,
  }))

  const events = year.subjects
    .flatMap((subject) => {
      const subjectEvents = subject.agenda?.eventos ?? []
      return subjectEvents.map((evento) => ({
        id: evento.id,
        titulo: `${evento.titulo} (${subject.nombre})`,
        fecha: evento.fecha,
        tipo: evento.tipoEvento.nombre,
        tipoId: evento.tipoEventoId,
        subjectSlug: subject.slug,
        subjectId: subject.id,
        materiaNombre: subject.nombre,
        descripcionHtml: evento.descripcionHtml,
        tituloOriginal: evento.titulo,
      }))
    })
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

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
          <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
                  Agenda
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    Calendario del año
                  </h2>
                  <AdminControls yearId={year.id}>
                    <AdminTriggerButton
                      action="new-event"
                      className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar nuevo evento
                    </AdminTriggerButton>
                  </AdminControls>
                </div>
              </div>
              <p className="max-w-xl text-sm text-white/48">
                Consultá las fechas importantes del año y entrá a cada materia para
                ver el detalle completo.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(324px,0.8fr)] 2xl:grid-cols-[minmax(0,1.82fr)_minmax(344px,0.78fr)]">
              <EventCalendarAdmin
                events={events}
                emptyMessage="Todavía no hay eventos visibles a nivel año. Entrá a una materia para ver su agenda real."
                yearId={year.id}
                tiposEvento={tiposEvento}
                subjects={modalSubjects}
              />

              <div className="space-y-3 xl:min-w-[324px] 2xl:min-w-[344px]">
                {nextEvents.length === 0 ? (
                  <DarkCard className="p-5 text-sm leading-6 text-white/58">
                    Por ahora no hay eventos próximos en este año.
                  </DarkCard>
                ) : (
                  nextEvents.map((evento) => (
                    <DarkCard key={evento.id} className="p-4 2xl:p-[18px]">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
                              <span>{evento.tipo}</span>
                              <span>•</span>
                              <Link href={`/materia/${evento.subjectSlug}`} className="hover:text-white transition-colors">
                                {evento.subjectNombre}
                              </Link>
                            </div>
                            <h3 className="mt-2 text-base font-black tracking-tight text-white leading-snug 2xl:text-lg">
                              {evento.titulo}
                            </h3>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`inline-flex max-w-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${colors.chipClassName}`}
                            >
                              {formatDateTime(evento.fecha)}
                            </span>
                            <DeleteEventoButton
                              eventoId={evento.id}
                              subjectSlug={evento.subjectSlug}
                              yearId={year.id}
                            />
                          </div>
                        </div>
                      </div>

                      {evento.descripcionHtml ? (
                        <div
                          className="space-y-2 text-sm leading-6 text-white/62 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeRichHtml(evento.descripcionHtml),
                          }}
                        />
                      ) : null}
                    </DarkCard>
                  ))
                )}
              </div>
            </div>
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
      </div>
      <div className="lg:hidden">
        <MobileYear
          year={year}
          allYears={allYears}
          nextEvents={nextEvents}
          careerName={year.career.nombre}
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
