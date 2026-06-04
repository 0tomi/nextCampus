import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { ConfigButton } from '@/components/shell/ConfigButton'
import {
  getCareer,
  getHomeCalendarEvents,
  getLatestApuntes,
  getTiposEvento,
  getPeriodos,
} from '@/lib/queries'
import { todayKeyAR } from '@/lib/utils'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { MobileHome } from '@/components/mobile/home/MobileHome'
import { MobileShell } from '@/components/mobile/shell/MobileShell'
import { HomeYearsGrid } from '@/components/home/HomeYearsGrid'
import { HomeGlobalCalendar } from '@/components/home/HomeGlobalCalendar'
import { HomeLatestApuntes } from '@/components/home/HomeLatestApuntes'
import { HomeSidebar } from '@/components/home/HomeSidebar'
import { Mascot } from '@/components/ui/Mascot'
import {
  PREFERENCES_KEY,
  isCommissionVisible,
  isSubjectVisible,
  readPreferencesFromCookie,
} from '@/lib/preferences'
export const metadata: Metadata = {
  title: 'Inicio | NextCampus',
  description: 'Campus académico con calendario, apuntes y práctica por materia.',
}

export const revalidate = 300

export default async function HomePage() {
  const cookieStore = await cookies()
  const initialPrefs = readPreferencesFromCookie(
    cookieStore.get(PREFERENCES_KEY)?.value ?? null,
  )

  const [career, homeCalendarEventsRaw, tiposEvento, latestApuntesRaw, periodos] = await Promise.all([
    getCareer(),
    getHomeCalendarEvents(),
    getTiposEvento(),
    getLatestApuntes(),
    getPeriodos(),
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
                  <Shield className="size-4" />
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
              <div className="mb-5 flex justify-center">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-3">
                  <Mascot size={96} className="opacity-95" />
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">CARRERA</p>
              <h1 className="mt-2 text-2xl font-black text-white">Todavía no hay datos.</h1>
              <p className="mt-3 text-sm text-white/55 leading-relaxed">Cuando esté listo vas a ver acá los años y materias de la carrera.</p>
            </div>
          </MobileShell>
        </div>
      </>
    )
  }

  // El corte "próximos eventos" depende del día actual del render.
  const todayKey = todayKeyAR()

  // El filtrado por materias/comisiones del usuario se hace acá, en el servidor,
  // usando las preferencias de la cookie. Así al navegador viaja solo lo que la
  // persona eligió, en vez de todo el material de la carrera. El caché de las
  // queries se mantiene sin filtrar (compartido entre todos); el filtro vive
  // fuera de él. Sin preferencias guardadas no mandamos material: el home
  // muestra el aviso para configurar.
  const hasPrefs = initialPrefs !== null

  const isEventVisibleForPrefs = (event: {
    yearSlug: string | null
    subjectSlug: string
    commissionSlug: string | null
  }): boolean => {
    if (!hasPrefs || !event.yearSlug) return false
    if (!isSubjectVisible(event.yearSlug, event.subjectSlug, initialPrefs)) return false
    if (!event.commissionSlug) return true
    return isCommissionVisible(
      event.yearSlug,
      event.subjectSlug,
      event.commissionSlug,
      initialPrefs,
    )
  }

  const upcomingEvents = homeCalendarEventsRaw.reduce<
    Array<{
      id: string
      titulo: string
      descripcionHtml: string | null
      fecha: string
      hora: string | null
      tipo: string
      tipoId: string
      subjectId: string
      subjectSlug: string
      subjectNombre: string
      yearId: string | null
      yearSlug: string | null
      commissionId: string | null
      commissionSlug: string | null
      commissionNombre: string | null
      apuntes: (typeof homeCalendarEventsRaw)[number]['apuntes']
    }>
  >((acc, event) => {
    if (event.fecha < todayKey) return acc

    const subject = event.agenda?.subject
    const year = subject?.year

    if (!subject || !year) return acc

    const visibleEvent = {
      id: event.id,
      titulo: event.titulo,
      descripcionHtml: event.descripcionHtml,
      fecha: event.fecha,
      hora: event.hora,
      tipo: event.tipoEvento.nombre,
      tipoId: event.tipoEventoId,
      subjectId: subject.id,
      subjectSlug: subject.slug,
      subjectNombre: subject.nombre,
      yearId: year.id,
      yearSlug: year.slug,
      commissionId: event.agenda?.commissionId ?? null,
      commissionSlug: event.agenda?.commission?.slug ?? null,
      commissionNombre: event.agenda?.commission?.nombre ?? null,
      apuntes: event.apuntes,
    }

    if (isEventVisibleForPrefs(visibleEvent)) {
      acc.push(visibleEvent)
    }

    return acc
  }, [])
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))
    .slice(0, 50)


  const homeCalendarEvents = homeCalendarEventsRaw.reduce<
    Array<{
      id: string
      titulo: string
      fecha: string
      hora: string | null
      tipo: string
      tipoId: string
      yearNombre: string
      yearSlug: string
      subjectSlug: string
      subjectId: string
      materiaNombre: string
      descripcionHtml: string | null
      commissionSlug: string | null
      commissionNombre: string | null
      agendaId: string
      yearId: string
      apuntes: Array<{
        id: string
        titulo: string
        slug: string
        subject: { slug: string; year: { slug: string } }
      }>
    }>
  >((acc, event) => {
    const subject = event.agenda?.subject
    const year = subject?.year

    if (!subject || !year) {
      return acc
    }

    const calendarEvent = {
      id: event.id,
      titulo: event.titulo,
      fecha: event.fecha,
      hora: event.hora,
      tipo: event.tipoEvento.nombre,
      tipoId: event.tipoEventoId,
      yearNombre: year.nombre,
      yearSlug: year.slug,
      subjectSlug: subject.slug,
      subjectId: subject.id,
      materiaNombre: subject.nombre,
      descripcionHtml: event.descripcionHtml,
      commissionSlug: event.agenda?.commission?.slug ?? null,
      commissionNombre: event.agenda?.commission?.nombre ?? null,
      agendaId: event.agenda.id,
      yearId: year.id,
      apuntes: event.apuntes,
    }

    if (isEventVisibleForPrefs(calendarEvent)) {
      acc.push(calendarEvent)
    }

    return acc
  }, [])

  // Señal aparte: ¿existe algún apunte en todo el sistema? El mensaje de estado
  // vacío de la sección depende de esto, no de cuántos quedaron tras filtrar.
  const hasAnyApuntes = latestApuntesRaw.length > 0

  const latestApuntes = latestApuntesRaw.reduce<
    Array<{
      id: string
      titulo: string
      slug: string
      createdAt: Date
      subjectSlug: string
      subjectNombre: string
      yearSlug: string
      yearNombre: string
    }>
  >((acc, apunte) => {
    if (acc.length >= 6) return acc

    const visibleApunte = {
      id: apunte.id,
      titulo: apunte.titulo,
      slug: apunte.slug,
      createdAt: apunte.createdAt,
      subjectSlug: apunte.subject.slug,
      subjectNombre: apunte.subject.nombre,
      yearSlug: apunte.subject.year.slug,
      yearNombre: apunte.subject.year.nombre,
    }

    if (hasPrefs && isSubjectVisible(visibleApunte.yearSlug, visibleApunte.subjectSlug, initialPrefs)) {
      acc.push(visibleApunte)
    }

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
                <Shield className="size-4" />
                Admin
              </Link>
            </div>
          }
          sidebar={
            <HomeSidebar careerName={career.nombre} initialPrefs={initialPrefs} years={career.years} />
          }
          headerOverlay={
            <div className="absolute bottom-[-1px] left-[332px] z-10 hidden lg:block">
              <Mascot size={60} />
            </div>
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

            <HomeGlobalCalendar
              initialPrefs={initialPrefs}
              events={homeCalendarEvents}
              periodos={periodos}
            />

            <HomeLatestApuntes
              initialPrefs={initialPrefs}
              notes={latestApuntes}
              hasAnyNotes={hasAnyApuntes}
            />

            <section className="space-y-5">
              <div className="px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
                  MATERIAS POR AÑO
                </p>
              </div>

              <HomeYearsGrid initialPrefs={initialPrefs} years={career.years} />
            </section>
          </AnimateIn>
        </DashboardShell>
      </div>
      <div className="lg:hidden">
        <MobileHome
          career={career}
          initialPrefs={initialPrefs}
          upcomingEvents={upcomingEvents}
          tiposEvento={tiposEvento}
          calendarEvents={homeCalendarEvents}
          latestApuntes={latestApuntes}
          hasAnyNotes={hasAnyApuntes}
        />
      </div>
    </>
  )
}
