import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowRight, CirclePlay } from 'lucide-react'
import { getYearBySlug, getTiposEvento, getCareer, getCategoriasApunte } from '@/lib/queries'
import { getYearColorClasses } from '@/lib/yearColors'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { DarkCard } from '@/components/ui/DarkCard'
import { YearPageAdminOverlay } from '@/components/admin/YearPageAdminOverlay'
import { EditYearButton } from '@/components/admin/EditYearButton'
import { MobileYear } from '@/components/mobile/year/MobileYear'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { YearOverviewEvents } from '@/components/year/YearOverviewEvents'
import { todayKeyAR } from '@/lib/utils'
import { formatDescription } from '@/lib/text'

function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/resources/google_drive_logo_icon_159334.png"
      alt="Google Drive"
      width={20}
      height={20}
      className={className}
    />
  )
}

export const metadata: Metadata = {
  title: 'Año académico | NextCampus',
  description: 'Accedé a materias, calendario y apuntes del año académico.',
}

export const revalidate = 300

function getSubjectVisibleEvents<TEvent>(subject: { agendas: Array<{ eventos: TEvent[] }> }): TEvent[] {
  return subject.agendas.flatMap((agenda) => agenda.eventos)
}

export default async function YearPage({
  params,
}: {
  params: Promise<{ yearSlug: string }>
}) {
  const { yearSlug } = await params
  const [year, tiposEvento, career, categoriasDisponibles] = await Promise.all([
    getYearBySlug(yearSlug),
    getTiposEvento(),
    getCareer(),
    getCategoriasApunte(),
  ])
  if (!year) notFound()

  const allYears = (career?.years ?? []).map(y => ({
    slug: y.slug,
    nombre: y.nombre,
    color: y.color,
    subjectsCount: y.subjects.length,
    orden: y.orden,
    subjects: y.subjects.map(s => ({
      id: s.id,
      slug: s.slug,
      nombre: s.nombre,
    })),
  }))

  const yearIndex = (career?.years ?? []).findIndex(y => y.id === year.id)

  // El corte "próximos eventos" depende del día actual del render.
  const todayKey = todayKeyAR()
  const nextEvents = year.subjects.reduce<
    Array<{
      id: string
      titulo: string
      fecha: string
      hora: string | null
      tipo: string
      tipoId: string
      subjectId: string
      subjectSlug: string
      subjectNombre: string
      materiaNombre: string
      descripcionHtml: string | null
      commissionId: string | null
      commissionSlug: string | null
      commissionNombre: string | null
      createdByUserId: string | null
      apuntes: (typeof year.subjects)[number]['agendas'][number]['eventos'][number]['apuntes']
    }>
  >((acc, subject) => {
    for (const event of getSubjectVisibleEvents(subject)) {
      if (event.fecha < todayKey) continue

      acc.push({
        id: event.id,
        titulo: event.titulo,
        fecha: event.fecha,
        hora: event.hora,
        tipo: event.tipoEvento.nombre,
        tipoId: event.tipoEventoId,
        subjectId: subject.id,
        subjectSlug: subject.slug,
        subjectNombre: subject.nombre,
        materiaNombre: subject.nombre,
        descripcionHtml: event.descripcionHtml,
        commissionId: event.commissionId,
        commissionSlug: event.commission?.slug ?? null,
        commissionNombre: event.commission?.nombre ?? null,
        createdByUserId: event.createdByUserId,
        apuntes: event.apuntes,
      })
    }

    return acc
  }, [])
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))

  const colors = getYearColorClasses({ slug: year.slug, color: year.color })
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
        createdByUserId: evento.createdByUserId,
        apuntes: evento.apuntes,
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
      categoriasDisponibles,
    }))

  return (
    <>
      <div className="hidden lg:block" style={colors.style}>
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

            {(year.driveUrl || year.playlistUrl) && (
              <div className="flex flex-wrap items-center gap-2">
                {year.driveUrl && (
                  <a
                    href={year.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <GoogleDriveIcon className="size-5" />
                    Drive del año
                  </a>
                )}

                {year.playlistUrl && (
                  <a
                    href={year.playlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <CirclePlay className="size-5 text-red-400" />
                    Playlist del año
                  </a>
                )}
              </div>
            )}
          </section>

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
                      <ArrowRight className="size-4" />
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
          descripcion: year.descripcion,
          driveUrl: year.driveUrl,
          playlistUrl: year.playlistUrl,
          playlistEnabled: year.playlistEnabled,
          orden: yearIndex >= 0 ? yearIndex + 1 : 1,
          color: year.color,
        }}
      />
    </>
  )
}
