'use client'

import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { YearCarousel } from './YearCarousel'
import { AgendaCard } from '@/components/mobile/agenda/AgendaCard'
import { AdminControls } from '@/components/admin/AdminControls'
import { AddYearButton } from '@/components/admin/HomeAdminOverlay'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { usePreferences } from '@/hooks/usePreferences'
import { isYearVisible, isSubjectVisible } from '@/lib/preferences'

interface CareerForMobile {
  nombre: string
  descripcion: string | null
  years: Array<{
    id: string
    slug: string
    nombre: string
    subjects: Array<{
      id: string
      slug: string
      nombre: string
      descripcion: string | null
      driveUrl: string | null
    }>
  }>
}

interface UpcomingEvent {
  id: string
  titulo: string
  fecha: Date | string
  tipo: string
  subjectSlug: string
  subjectNombre: string
  yearSlug: string | null
}

export function MobileHome({
  career,
  upcomingEvents,
}: {
  career: CareerForMobile
  upcomingEvents: UpcomingEvent[]
}) {
  const { prefs, isHydrated } = usePreferences()

  const visibleYears = !isHydrated
    ? career.years
    : career.years
        .filter((y) => isYearVisible(y.slug, prefs))
        .map((y) => ({
          ...y,
          subjects: y.subjects.filter((s) => isSubjectVisible(y.slug, s.slug, prefs)),
        }))

  const filteredUpcomingEvents = !isHydrated
    ? upcomingEvents
    : upcomingEvents.filter((e) => {
        if (!e.yearSlug) return false
        if (!isYearVisible(e.yearSlug, prefs)) return false
        if (!isSubjectVisible(e.yearSlug, e.subjectSlug, prefs)) return false
        return true
      })

  const totalSubjects = visibleYears.reduce((acc, y) => acc + y.subjects.length, 0)

  const drawerYears: MobileShellDrawerYear[] = visibleYears.map((y) => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjects.length,
  }))

  if (isHydrated && visibleYears.length === 0) {
    return (
      <MobileShell
        title="NextCampus"
        subtitle={career.nombre}
        drawerYears={[]}
        careerName={career.nombre}
      >
        <div className="px-[18px] pt-6 flex flex-col gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            Inicio personalizado
          </p>
          <h2 className="text-2xl font-bold text-white">
            No tenés años o materias visibles
          </h2>
          <p className="text-sm leading-relaxed text-white/55">
            Elegí los que querés ver en tu inicio desde la pantalla de personalización.
          </p>
          <Link
            href="/configurar"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-uader-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-uader-red-light self-start"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Configurar
          </Link>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell
      title="NextCampus"
      subtitle={career.nombre}
      drawerYears={drawerYears}
      careerName={career.nombre}
    >
      <div className="flex flex-col gap-7">
        {/* HERO */}
        <section className="px-[18px] pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">CARRERA</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white leading-tight">{career.nombre}</h1>
          {career.descripcion && (
            <p className="mt-3 text-sm leading-relaxed text-white/55">{career.descripcion}</p>
          )}
        </section>

        {/* STATS — 3 cards 1fr */}
        <section className="px-[18px] grid grid-cols-3 gap-2">
          <StatTile label="Años" value={visibleYears.length} />
          <StatTile label="Materias" value={totalSubjects} />
          <StatTile label="Próximos" value={filteredUpcomingEvents.length} />
        </section>

        {/* CAROUSEL */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Nivel</p>
              <h2 className="mt-1 text-lg font-black text-white">Años académicos</h2>
            </div>
            <AdminControls requireGlobal noWrapper>
              <AddYearButton />
            </AdminControls>
          </div>
          <YearCarousel years={visibleYears} />
        </section>

        {/* PRÓXIMOS EVENTOS */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Agenda</p>
            <h2 className="mt-1 text-lg font-black text-white">Próximos eventos</h2>
          </div>
          <div className="px-[18px] flex flex-col gap-2.5">
            {filteredUpcomingEvents.length === 0 ? (
              <EmptyAgenda />
            ) : (
              filteredUpcomingEvents.map((e) => (
                <Link
                  key={e.id}
                  href={buildSubjectHref({
                    yearSlug: e.yearSlug,
                    subjectSlug: e.subjectSlug,
                  })}
                >
                  <AgendaCard
                    fecha={e.fecha}
                    tipo={e.tipo}
                    titulo={`${e.titulo} · ${e.subjectNombre}`}
                  />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </MobileShell>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</span>
      <span className="text-xl font-black text-white">{value}</span>
    </div>
  )
}

function EmptyAgenda() {
  return (
    <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-4 text-sm text-white/45 text-center">
      Por ahora no hay eventos próximos.
    </div>
  )
}
