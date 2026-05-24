'use client'

import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { YearCarousel } from './YearCarousel'
import { AgendaCard } from '@/components/mobile/agenda/AgendaCard'
import { AdminControls } from '@/components/admin/AdminControls'
import { AddYearButton } from '@/components/admin/HomeAdminOverlay'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { Mascot } from '@/components/ui/Mascot'
import { usePreferences } from '@/hooks/usePreferences'
import { isYearVisible, isSubjectVisible, type UserPreferences } from '@/lib/preferences'

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
  initialPrefs,
  upcomingEvents,
}: {
  career: CareerForMobile
  initialPrefs: UserPreferences | null
  upcomingEvents: UpcomingEvent[]
}) {
  const { prefs, isHydrated } = usePreferences(initialPrefs)
  const shouldWaitForStoredPrefs = !isHydrated && initialPrefs === null
  const effectivePrefs = isHydrated ? prefs : initialPrefs

  if (shouldWaitForStoredPrefs) {
    return (
      <MobileShell
        title="NextCampus"
        subtitle={career.nombre}
        drawerYears={[]}
        careerName={career.nombre}
      >
        <MobileHomeSkeleton />
      </MobileShell>
    )
  }

  const visibleYears = career.years
        .filter((y) => isYearVisible(y.slug, effectivePrefs))
        .map((y) => ({
          ...y,
          subjects: y.subjects.filter((s) => isSubjectVisible(y.slug, s.slug, effectivePrefs)),
        }))

  const filteredUpcomingEvents = upcomingEvents.filter((e) => {
        if (!e.yearSlug) return false
        if (!isYearVisible(e.yearSlug, effectivePrefs)) return false
        if (!isSubjectVisible(e.yearSlug, e.subjectSlug, effectivePrefs)) return false
        return true
      })

  const totalSubjects = visibleYears.reduce((acc, y) => acc + y.subjects.length, 0)

  const drawerYears: MobileShellDrawerYear[] = visibleYears.map((y) => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjects.length,
  }))

  if (visibleYears.length === 0) {
    return (
      <MobileShell
        title="NextCampus"
        subtitle={career.nombre}
        drawerYears={[]}
        careerName={career.nombre}
      >
        <div className="px-[18px] pt-6 flex flex-col gap-4">
          <div className="flex justify-center">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-3">
              <Mascot size={96} className="opacity-95" />
            </div>
          </div>
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
          <div className="relative overflow-hidden rounded-[24px] border border-white/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-orange-400/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 left-0 h-24 w-24 rounded-full bg-amber-200/8 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">CARRERA</p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white leading-tight">{career.nombre}</h1>
                {career.descripcion && (
                  <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-white/55">{career.descripcion}</p>
                )}
              </div>
              <div className="shrink-0 -mr-1 -mt-1">
                <Mascot size={88} className="opacity-95" />
              </div>
            </div>
          </div>
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

function MobileHomeSkeleton() {
  return (
    <div className="flex flex-col gap-7 px-[18px] pt-4" aria-hidden="true">
      <section>
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-8 w-4/5 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
      </section>
      <section className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-[70px] animate-pulse rounded-lg border border-white/5 bg-[#1a1a1a]"
          />
        ))}
      </section>
      <section>
        <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-[260px] animate-pulse rounded-xl border border-white/5 bg-[#1a1a1a]" />
      </section>
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
