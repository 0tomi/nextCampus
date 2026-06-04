import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  NotebookTabs,
  Sparkles,
  Plus,
  Pencil,
  CirclePlay,
} from 'lucide-react'
import { MobileSubject } from '@/components/mobile/subject/MobileSubject'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { DarkCard } from '@/components/ui/DarkCard'
import { getYearColorClasses } from '@/lib/yearColors'
import {
  SubjectPageAdminOverlay,
  AdminTriggerButton,
} from '@/components/admin/SubjectPageAdminOverlay'
import { AdminControls } from '@/components/admin/AdminControls'
import { formatDescription } from '@/lib/text'
import {
  buildSubjectHref,
  buildSubjectQuizHref,
} from '@/components/mobile/shared/subjectRoutes'
import type { SubjectRouteContext } from './subject-route-context'
import { SubjectEventsSection } from '@/components/subject/SubjectEventsSection'
import { SubjectEventSummaryCard } from '@/components/subject/SubjectEventSummaryCard'
import { ApuntesFeed } from '@/components/apuntes/ApuntesFeed'
import { GoogleDriveIcon } from '@/components/ui/GoogleDriveIcon'

type YearColorClasses = ReturnType<typeof getYearColorClasses>

type VisibleEvent = SubjectRouteContext['visibleEvents'][number]

function toSubjectEvents(events: readonly VisibleEvent[]) {
  return events.map((evento) => ({
    id: evento.id,
    titulo: evento.titulo,
    fecha: evento.fecha,
    hora: evento.hora,
    descripcionHtml: evento.descripcionHtml,
    tipoEvento: evento.tipoEvento,
    tipoEventoId: evento.tipoEventoId,
    commissionId: evento.commissionId,
    commissionSlug: evento.commission?.slug ?? null,
    commissionNombre: evento.commission?.nombre ?? null,
    createdByNombre: evento.createdByNombre ?? null,
    apuntes: evento.apuntes,
  }))
}

function toMobileEvents(events: readonly VisibleEvent[]) {
  return events.map((evento) => ({
    id: evento.id,
    titulo: evento.titulo,
    descripcionHtml: evento.descripcionHtml,
    fecha: evento.fecha,
    hora: evento.hora,
    tipoEventoId: evento.tipoEventoId,
    tipoEvento: evento.tipoEvento,
    commissionId: evento.commissionId,
    commissionSlug: evento.commission?.slug ?? null,
    commissionNombre: evento.commission?.nombre ?? null,
    createdByUserId: evento.createdByUserId,
    createdByNombre: evento.createdByNombre ?? null,
  }))
}

function toEventSummaryItems(events: readonly VisibleEvent[]) {
  return events.map((evento) => ({ commissionId: evento.commissionId }))
}

export function SubjectRoutePage({
  subject,
  tiposEvento,
  allYears,
  activeCommission,
  visibleEvents,
  periodos,
  agendaId,
  focusApunteSlug,
}: SubjectRouteContext & { focusApunteSlug?: string }) {
  const colors = getYearColorClasses({ slug: subject.year.slug, color: subject.year.color })
  const subjectHref = buildSubjectHref({
    yearSlug: subject.year.slug,
    subjectSlug: subject.slug,
  })
  const quizHref = buildSubjectQuizHref({
    yearSlug: subject.year.slug,
    subjectSlug: subject.slug,
  })

  return (
    <>
      <SubjectDesktopView
        activeCommission={activeCommission}
        agendaId={agendaId}
        colors={colors}
        focusApunteSlug={focusApunteSlug}
        periodos={periodos}
        quizHref={quizHref}
        subject={subject}
        subjectHref={subjectHref}
        tiposEvento={tiposEvento}
        visibleEvents={visibleEvents}
      />

      <SubjectMobileView
        activeCommissionName={activeCommission?.nombre}
        allYears={allYears}
        focusApunteSlug={focusApunteSlug}
        periodos={periodos}
        subject={subject}
        tiposEvento={tiposEvento}
        visibleEvents={visibleEvents}
      />

      <SubjectPageAdminOverlay
        subject={{
          id: subject.id,
          slug: subject.slug,
          nombre: subject.nombre,
          descripcion: subject.descripcion || undefined,
          driveUrl: subject.driveUrl,
          playlistUrl: subject.playlistUrl,
          playlistEnabled: subject.playlistEnabled,
          commissions: subject.commissions,
          categoriasDisponibles: subject.categoriasDisponibles,
        }}
        agendaId={agendaId}
        yearId={subject.year.id}
        tiposEvento={tiposEvento}
      />
    </>
  )
}

function SubjectDesktopView({
  activeCommission,
  agendaId,
  colors,
  focusApunteSlug,
  periodos,
  quizHref,
  subject,
  subjectHref,
  tiposEvento,
  visibleEvents,
}: Pick<SubjectRouteContext, 'activeCommission' | 'agendaId' | 'periodos' | 'subject' | 'tiposEvento' | 'visibleEvents'> & {
  colors: YearColorClasses
  focusApunteSlug?: string
  quizHref: string
  subjectHref: string
}) {
  const sectionItems = getSubjectSidebarItems({ colors, subject, visibleEvents })

  return (
    <div className="hidden lg:block" style={colors.style}>
      <DashboardShell
        topbar={<SubjectTopbar subject={subject} />}
        sidebar={<Sidebar eyebrow="Materia" title={subject.nombre} items={sectionItems} />}
        mainClassName="space-y-10"
      >
        <SubjectHeroBlock
          activeCommission={activeCommission}
          colors={colors}
          subject={subject}
          subjectHref={subjectHref}
          visibleEvents={visibleEvents}
        />

        <SubjectEventsSection
          subject={{
            id: subject.id,
            slug: subject.slug,
            nombre: subject.nombre,
            year: {
              id: subject.year.id,
              slug: subject.year.slug,
            },
          }}
          agendaId={agendaId}
          tiposEvento={tiposEvento}
          categoriasDisponibles={subject.categoriasDisponibles}
          commissions={subject.commissions}
          activeCommission={activeCommission}
          events={toSubjectEvents(visibleEvents)}
          periodos={periodos}
          chipClassName={colors.chipClassName}
        />

        <SubjectQuizSection colors={colors} quizHref={quizHref} subject={subject} />

        <SubjectApuntesSection focusApunteSlug={focusApunteSlug} subject={subject} />
      </DashboardShell>
    </div>
  )
}

function getSubjectSidebarItems({
  colors,
  subject,
  visibleEvents,
}: {
  colors: YearColorClasses
  subject: SubjectRouteContext['subject']
  visibleEvents: readonly VisibleEvent[]
}) {
  return [
    {
      id: 'year',
      href: `/${subject.year.slug}`,
      label: subject.year.nombre,
      badge: <ArrowLeft className="size-4" />,
      meta: 'Volver al año',
      badgeClassName: colors.badgeClassName,
    },
    {
      id: 'calendar',
      href: '#calendario',
      label: 'Calendario',
      badge: <CalendarDays className="size-4" />,
      meta: `${visibleEvents.length} eventos`,
      badgeClassName: 'from-white/15 to-white/5 text-white',
    },
    {
      id: 'quiz',
      href: '#quiz',
      label: 'Quiz',
      badge: <Sparkles className="size-4" />,
      meta: 'Practicá',
      badgeClassName: 'from-violet-400 to-purple-500 text-white',
    },
    {
      id: 'notes',
      href: '#apuntes',
      label: 'Apuntes',
      badge: <NotebookTabs className="size-4" />,
      meta: `${subject.apuntesTotal} recursos`,
      badgeClassName: 'from-cyan-400 to-blue-500 text-white',
    },
  ]
}

function SubjectTopbar({ subject }: { subject: SubjectRouteContext['subject'] }) {
  return (
    <Link
      href={`/${subject.year.slug}`}
      className="inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition-colors hover:text-white/80"
    >
      <ArrowLeft className="size-4" />
      {subject.year.nombre}
    </Link>
  )
}

function SubjectHeroBlock({
  activeCommission,
  colors,
  subject,
  subjectHref,
  visibleEvents,
}: Pick<SubjectRouteContext, 'activeCommission' | 'subject' | 'visibleEvents'> & {
  colors: YearColorClasses
  subjectHref: string
}) {
  return (
    <AnimateIn className="space-y-6">
      <SubjectBreadcrumbs activeCommissionName={activeCommission?.nombre} subject={subject} subjectHref={subjectHref} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <SubjectHeroCard activeCommission={activeCommission} colors={colors} subject={subject} />
        <SubjectEventSummaryCard
          subjectSlug={subject.slug}
          apuntesCount={subject.apuntesTotal}
          commissions={subject.commissions}
          activeCommission={activeCommission}
          events={toEventSummaryItems(visibleEvents)}
        />
      </section>
    </AnimateIn>
  )
}

function SubjectBreadcrumbs({
  activeCommissionName,
  subject,
  subjectHref,
}: {
  activeCommissionName?: string
  subject: SubjectRouteContext['subject']
  subjectHref: string
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">
      <Link href="/" className="transition-colors hover:text-white/72">
        {subject.year.career.nombre}
      </Link>
      <span>/</span>
      <Link href={`/${subject.year.slug}`} className="transition-colors hover:text-white/72">
        {subject.year.nombre}
      </Link>
      <span>/</span>
      <Link href={subjectHref} className="transition-colors hover:text-white/72">
        {subject.nombre}
      </Link>
      {activeCommissionName ? (
        <>
          <span>/</span>
          <span className="text-white/72">{activeCommissionName}</span>
        </>
      ) : null}
    </nav>
  )
}

function SubjectHeroCard({
  activeCommission,
  colors,
  subject,
}: Pick<SubjectRouteContext, 'activeCommission' | 'subject'> & { colors: YearColorClasses }) {
  return (
    <DarkCard className="p-6 sm:p-8">
      <SubjectHeroBadges activeCommissionName={activeCommission?.nombre} colors={colors} yearName={subject.year.nombre} />
      <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">{subject.nombre}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64 sm:text-base">
        {subject.descripcion?.trim()
          ? formatDescription(subject.descripcion.trim())
          : 'Materia sin descripción aún. Los administradores pueden agregarla desde el modo edición.'}
      </p>
      <SubjectResourceActions subject={subject} />
    </DarkCard>
  )
}

function SubjectHeroBadges({
  activeCommissionName,
  colors,
  yearName,
}: {
  activeCommissionName?: string
  colors: YearColorClasses
  yearName: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`inline-flex border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${colors.chipClassName}`}>
        {yearName}
      </span>
      {activeCommissionName ? (
        <span className="inline-flex border border-white/10 bg-surface-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/72">
          {activeCommissionName}
        </span>
      ) : null}
    </div>
  )
}

function SubjectResourceActions({ subject }: { subject: SubjectRouteContext['subject'] }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <SubjectExternalLinks driveUrl={subject.driveUrl} playlistUrl={subject.playlistUrl} />
      <AdminControls yearId={subject.year.id} requireAcademicStructure>
        <AdminTriggerButton
          action="edit-subject"
          className="group relative inline-flex size-9 cursor-pointer items-center justify-center rounded border border-white/10 bg-surface-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Pencil className="size-4" />
          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 scale-0 whitespace-nowrap rounded border border-white/5 bg-black/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white opacity-0 shadow-md transition-all group-hover:scale-100 group-hover:opacity-100">
            Editar materia
          </span>
        </AdminTriggerButton>
      </AdminControls>
    </div>
  )
}

function SubjectExternalLinks({ driveUrl, playlistUrl }: { driveUrl?: string | null; playlistUrl?: string | null }) {
  return (
    <>
      {driveUrl ? (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <GoogleDriveIcon className="size-5" />
          Drive con contenido de la materia
        </a>
      ) : null}
      {playlistUrl ? (
        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <CirclePlay className="size-5 text-red-400" />
          Playlist de clases
        </a>
      ) : null}
    </>
  )
}

function SubjectQuizSection({
  colors,
  quizHref,
  subject,
}: {
  colors: YearColorClasses
  quizHref: string
  subject: SubjectRouteContext['subject']
}) {
  return (
    <section id="quiz" className="space-y-4">
      <SubjectSectionTitle
        action="upload-bank"
        actionLabel="Agregar nuevo banco de preguntas"
        eyebrow="Modo estudio"
        title="Poné a prueba lo que sabés"
        yearId={subject.year.id}
      />
      <DarkCard variant="interactive" className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className={`inline-flex size-12 shrink-0 items-center justify-center bg-gradient-to-r ${colors.progressClassName}`}>
              <Sparkles className="size-5" />
            </span>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Quiz de {subject.nombre}</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/58">
                Elegí uno o varios bancos de preguntas y practicá en modo práctica (con explicaciones) o examen.
              </p>
            </div>
          </div>
          <Link
            href={quizHref}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-start bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-light"
          >
            Empezar quiz
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </DarkCard>
    </section>
  )
}

function SubjectApuntesSection({
  focusApunteSlug,
  subject,
}: {
  focusApunteSlug?: string
  subject: SubjectRouteContext['subject']
}) {
  return (
    <section id="apuntes" className="space-y-4">
      <SubjectSectionTitle
        action="new-apunte"
        actionLabel="Agregar nuevos apuntes"
        eyebrow="Recursos"
        title="Apuntes y descargas"
        yearId={subject.year.id}
      />
      <ApuntesFeed
        subjectId={subject.id}
        subjectSlug={subject.slug}
        yearId={subject.year.id}
        yearSlug={subject.year.slug}
        categorias={subject.categoriasDisponibles}
        initialItems={subject.apuntes}
        initialHasMore={subject.apuntesHasMore}
        initialNextCursor={subject.apuntesNextCursor}
        focusApunteSlug={focusApunteSlug}
      />
    </section>
  )
}

function SubjectSectionTitle({
  action,
  actionLabel,
  eyebrow,
  title,
  yearId,
}: {
  action: 'new-apunte' | 'upload-bank'
  actionLabel: string
  eyebrow: string
  title: string
  yearId: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">{eyebrow}</p>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
        <AdminControls yearId={yearId}>
          <AdminTriggerButton
            action={action}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-white/10 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-white/70 shadow-lg transition-colors hover:bg-white/10 hover:text-white"
          >
            <Plus className="size-3" />
            {actionLabel}
          </AdminTriggerButton>
        </AdminControls>
      </div>
    </div>
  )
}

function SubjectMobileView({
  activeCommissionName,
  allYears,
  focusApunteSlug,
  periodos,
  subject,
  tiposEvento,
  visibleEvents,
}: Pick<SubjectRouteContext, 'allYears' | 'periodos' | 'subject' | 'tiposEvento' | 'visibleEvents'> & {
  activeCommissionName?: string
  focusApunteSlug?: string
}) {
  return (
    <div className="lg:hidden">
      <MobileSubject
        subject={subject}
        allYears={allYears}
        focusApunteSlug={focusApunteSlug}
        commissions={subject.commissions}
        events={toMobileEvents(visibleEvents)}
        periodos={periodos}
        activeCommissionName={activeCommissionName}
        tiposEvento={tiposEvento}
      />
    </div>
  )
}
