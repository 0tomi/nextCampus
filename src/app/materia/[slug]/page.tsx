import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  GraduationCap,
  NotebookTabs,
  Sparkles,
  Plus,
  Pencil,
  CirclePlay,
} from 'lucide-react'
import { getCareer, getSubjectPageBySlug, getTiposEvento } from '@/lib/queries'
import { MobileSubject } from '@/components/mobile/subject/MobileSubject'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { EventCalendarAdmin } from '@/components/calendar/EventCalendarAdmin'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { DarkCard } from '@/components/ui/DarkCard'
import { getYearColorClasses } from '@/lib/yearColors'
import { formatDateTime } from '@/lib/utils'
import { sanitizeRichHtml } from '@/lib/sanitize'
import {
  SubjectPageAdminOverlay,
  DeleteEventoButton,
  DeleteApunteButton,
  AdminTriggerButton,
} from '@/components/admin/SubjectPageAdminOverlay'
import { AdminControls } from '@/components/admin/AdminControls'
import { ApunteRecursoView } from '@/components/apuntes/ApunteRecursoView'
import { EditApunteButton } from '@/components/admin/EditApunteButton'

export const revalidate = 300

function DashboardBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-black shadow-[0_0_30px_rgba(249,115,22,0.22)]">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
          Materia
        </span>
        <span className="block text-lg font-black tracking-tight text-white">
          NextCampus
        </span>
      </span>
    </Link>
  )
}

function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/resources/google_drive_logo_icon_159334.png"
      alt="Google Drive"
      className={className}
    />
  )
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [subject, tiposEvento, career] = await Promise.all([
    getSubjectPageBySlug(slug),
    getTiposEvento(),
    getCareer(),
  ])
  if (!subject) notFound()

  const allYears = (career?.years ?? []).map(y => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjects.length,
  }))

  const agendaId = subject.agenda?.id ?? ''
  const eventos = subject.agenda?.eventos ?? []
  const colors = getYearColorClasses(subject.year.slug)
  const sectionItems = [
    {
      id: 'year',
      href: `/year/${subject.year.slug}`,
      label: subject.year.nombre,
      badge: <ArrowLeft className="h-4 w-4" />,
      meta: 'Volver al año',
      badgeClassName: colors.badgeClassName,
    },
    {
      id: 'calendar',
      href: '#calendario',
      label: 'Calendario',
      badge: <CalendarDays className="h-4 w-4" />,
      meta: `${eventos.length} eventos`,
      badgeClassName: 'from-white/15 to-white/5 text-white',
    },
    {
      id: 'quiz',
      href: '#quiz',
      label: 'Quiz',
      badge: <Sparkles className="h-4 w-4" />,
      meta: 'Practicá',
      badgeClassName: 'from-violet-400 to-purple-500 text-white',
    },
    {
      id: 'notes',
      href: '#apuntes',
      label: 'Apuntes',
      badge: <NotebookTabs className="h-4 w-4" />,
      meta: `${subject.apuntes.length} recursos`,
      badgeClassName: 'from-cyan-400 to-blue-500 text-black',
    },
  ]

  return (
    <>
    <div className="hidden lg:block">
    <DashboardShell
      brand={<DashboardBrand />}
      topbar={
        <Link
          href={`/year/${subject.year.slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition-colors hover:text-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          {subject.year.nombre}
        </Link>
      }
      sidebar={
        <Sidebar
          eyebrow="Materia"
          title={subject.nombre}
          items={sectionItems}
        />
      }
      mainClassName="space-y-10"
    >
      <AnimateIn className="space-y-6">
        <nav className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">
          <Link href="/" className="transition-colors hover:text-white/72">
            {subject.year.career.nombre}
          </Link>
          <span>/</span>
          <Link
            href={`/year/${subject.year.slug}`}
            className="transition-colors hover:text-white/72"
          >
            {subject.year.nombre}
          </Link>
          <span>/</span>
          <span className="text-white/72">{subject.nombre}</span>
        </nav>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <DarkCard className="p-6 sm:p-8">
            <span
              className={`inline-flex border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${colors.chipClassName}`}
            >
              {subject.year.nombre}
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {subject.nombre}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64 sm:text-base">
              {subject.descripcion.trim() || 'Materia sin descripción aún. Los administradores pueden agregarla desde el modo edición.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <a
                href={subject.driveUrl || `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(subject.nombre)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <GoogleDriveIcon className="h-5 w-5" />
                Drive con contenido de la materia
              </a>

              {/* Botón Playlist */}
              {subject.playlistUrl && subject.playlistEnabled && (
                <a
                  href={subject.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <CirclePlay className="h-5 w-5 text-red-400" />
                  Playlist de clases
                </a>
              )}

              {/* Botón Playlist para admins cuando está oculta */}
              {subject.playlistUrl && !subject.playlistEnabled && (
                <AdminControls yearId={subject.year.id}>
                  <a
                    href={subject.playlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 cursor-pointer"
                  >
                    <CirclePlay className="h-5 w-5 text-red-400/50" />
                    Playlist de clases
                    <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Oculta
                    </span>
                  </a>
                </AdminControls>
              )}

              <AdminControls yearId={subject.year.id}>
                <AdminTriggerButton
                  action="edit-drive"
                  className="group relative inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-surface-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 rounded bg-black/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap z-10 border border-white/5 shadow-md">
                    Editar link del drive
                  </span>
                </AdminTriggerButton>
              </AdminControls>
            </div>
          </DarkCard>

          <DarkCard className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Resumen
            </p>
            <div className="mt-4 space-y-4 text-sm text-white/64">
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
                <span>Eventos</span>
                <strong className="text-lg font-black text-white">
                  {eventos.length}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Apuntes</span>
                <strong className="text-lg font-black text-white">
                  {subject.apuntes.length}
                </strong>
              </div>
            </div>
          </DarkCard>
        </section>
      </AnimateIn>

      <section id="calendario" className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
              Agenda
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Calendario de eventos
              </h2>
              <AdminControls yearId={subject.year.id}>
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
            Fechas, entregas y avisos importantes de la materia en un solo lugar.
          </p>
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <EventCalendarAdmin
            events={eventos.map((evento) => ({
              id: evento.id,
              titulo: evento.titulo,
              fecha: evento.fecha,
              tipo: evento.tipoEvento.nombre,
              materiaNombre: subject.nombre,
              descripcionHtml: evento.descripcionHtml,
              tituloOriginal: evento.titulo,
              subjectSlug: subject.slug,
            }))}
            emptyMessage="Sin eventos cargados para esta materia."
            agendaId={agendaId}
            subjectSlug={subject.slug}
            yearId={subject.year.id}
            tiposEvento={tiposEvento}
          />

          <div className="space-y-3">
            {eventos.length === 0 ? (
              <DarkCard className="p-5 text-sm leading-6 text-white/58">
                Todavía no hay eventos detallados para esta materia.
              </DarkCard>
            ) : (
              eventos.map((evento) => (
                <DarkCard key={evento.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
                        {evento.tipoEvento.nombre}
                      </p>
                      <h3 className="mt-2 text-lg font-black tracking-tight text-white">
                        {evento.titulo}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${colors.chipClassName}`}
                      >
                        {formatDateTime(evento.fecha)}
                      </span>
                      <DeleteEventoButton
                        eventoId={evento.id}
                        subjectSlug={subject.slug}
                        yearId={subject.year.id}
                      />
                    </div>
                  </div>

                  {evento.descripcionHtml ? (
                    <div
                      className="mt-4 space-y-2 text-sm leading-6 text-white/62 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichHtml(evento.descripcionHtml ?? ''),
                      }}
                    />
                  ) : null}
                </DarkCard>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="quiz" className="space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Modo estudio
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Poné a prueba lo que sabés
            </h2>
            <AdminControls yearId={subject.year.id}>
              <AdminTriggerButton
                action="upload-bank"
                className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Agregar nuevo banco de preguntas
              </AdminTriggerButton>
            </AdminControls>
          </div>
        </div>

        <DarkCard variant="interactive" className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center bg-gradient-to-r ${colors.progressClassName}`}
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">
                  Quiz de {subject.nombre}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/58">
                  Elegí uno o varios bancos de preguntas y practicá en modo
                  práctica (con explicaciones) o examen.
                </p>
              </div>
            </div>
            <Link
              href={`/materia/${subject.slug}/quiz`}
              className="inline-flex shrink-0 items-center gap-2 self-start bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-uader-red-light cursor-pointer"
            >
              Empezar quiz
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </DarkCard>
      </section>

      <section id="apuntes" className="space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Recursos
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Apuntes y descargas
            </h2>
            <AdminControls yearId={subject.year.id}>
              <AdminTriggerButton
                action="new-apunte"
                className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Agregar nuevos apuntes
              </AdminTriggerButton>
            </AdminControls>
          </div>
        </div>

        {subject.apuntes.length === 0 ? (
          <p className="text-sm text-white/58">Sin apuntes.</p>
        ) : (
          <div className="stagger-children grid gap-4 xl:grid-cols-2">
            {subject.apuntes.map((apunte) => (
              <DarkCard key={apunte.id} className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
                      Apunte
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                      {apunte.titulo}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <AdminControls yearId={subject.year.id}>
                      <EditApunteButton
                        apunte={{
                          id: apunte.id,
                          titulo: apunte.titulo,
                          descripcionHtml: apunte.descripcionHtml,
                          recursos: apunte.recursos,
                        }}
                      />
                    </AdminControls>
                    <DeleteApunteButton
                      apunteId={apunte.id}
                      subjectSlug={subject.slug}
                      yearId={subject.year.id}
                    />
                  </div>
                </div>

                {apunte.descripcionHtml ? (
                  <div
                    className="mt-4 space-y-2 text-sm leading-6 text-white/62 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichHtml(apunte.descripcionHtml),
                    }}
                  />
                ) : null}

                {apunte.recursos.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3">
                    {apunte.recursos.map((recurso) => (
                      <ApunteRecursoView key={recurso.id} recurso={recurso} />
                    ))}
                  </div>
                )}
              </DarkCard>
            ))}
          </div>
        )}
      </section>
      <SubjectPageAdminOverlay
        subject={{
          id: subject.id,
          slug: subject.slug,
          nombre: subject.nombre,
          descripcion: subject.descripcion || undefined,
          driveUrl: subject.driveUrl,
          playlistUrl: subject.playlistUrl,
          playlistEnabled: subject.playlistEnabled,
        }}
        agendaId={agendaId}
        yearId={subject.year.id}
        tiposEvento={tiposEvento}
      />
    </DashboardShell>
    </div>
    <div className="lg:hidden">
      <MobileSubject subject={subject} allYears={allYears} />
    </div>
    </>
  )
}
