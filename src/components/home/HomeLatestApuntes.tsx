'use client'

import Link from 'next/link'
import { FileText, SlidersHorizontal } from 'lucide-react'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { DarkCard } from '@/components/ui/DarkCard'
import { usePreferences } from '@/hooks/usePreferences'
import { useSeenApuntes } from '@/hooks/useSeenApuntes'
import { isSubjectVisible, type UserPreferences } from '@/lib/preferences'
import { formatDate } from '@/lib/utils'

export interface HomeLatestApunte {
  id: string
  titulo: string
  slug: string
  createdAt: Date | string
  updatedAt: Date | string
  subjectSlug: string
  subjectNombre: string
  yearSlug: string
  yearNombre: string
}

interface HomeLatestApuntesProps {
  initialPrefs: UserPreferences | null
  notes: readonly HomeLatestApunte[]
  /**
   * Indica si existe algún apunte en el sistema (independiente del filtro del
   * usuario). El mensaje de estado vacío depende de esto, no de cuántos apuntes
   * llegaron ya filtrados: distingue "no hay nada cargado" de "nada con tu
   * selección actual".
   */
  hasAnyNotes: boolean
  variant?: 'desktop' | 'mobile'
}

function buildLatestApunteHref(
  apunte: Pick<HomeLatestApunte, 'yearSlug' | 'subjectSlug' | 'slug'>,
) {
  return `${buildSubjectHref({
    yearSlug: apunte.yearSlug,
    subjectSlug: apunte.subjectSlug,
  })}/apuntes/${apunte.slug}`
}

function isLatestApunteVisible(
  apunte: Pick<HomeLatestApunte, 'yearSlug' | 'subjectSlug'>,
  prefs: UserPreferences | null,
) {
  return isSubjectVisible(apunte.yearSlug, apunte.subjectSlug, prefs)
}

export function HomeLatestApuntes({
  initialPrefs,
  notes,
  hasAnyNotes,
  variant = 'desktop',
}: HomeLatestApuntesProps) {
  const { prefs, isHydrated } = usePreferences(initialPrefs)
  const shouldWaitForStoredPrefs = !isHydrated && initialPrefs === null
  const effectivePrefs = isHydrated ? prefs : initialPrefs
  const hasConfiguredSubjects = effectivePrefs !== null

  if (shouldWaitForStoredPrefs) {
    return variant === 'mobile'
      ? <HomeLatestApuntesMobileSkeleton />
      : <HomeLatestApuntesDesktopSkeleton />
  }

  if (!hasConfiguredSubjects) {
    return variant === 'mobile'
      ? <HomeLatestApuntesMobileSetupNotice />
      : <HomeLatestApuntesDesktopSetupNotice />
  }

  // `notes` ya llega filtrado desde el servidor; este filtro queda como red de
  // seguridad para cubrir el caso borde de que las preferencias del cliente
  // difieran de la cookie.
  const visibleNotes = notes
    .filter((note) => isLatestApunteVisible(note, effectivePrefs))
    .slice(0, 6)

  if (variant === 'mobile') {
    return <HomeLatestApuntesMobile notes={visibleNotes} hasAnyNotes={hasAnyNotes} />
  }

  return <HomeLatestApuntesDesktop notes={visibleNotes} hasAnyNotes={hasAnyNotes} />
}

function HomeLatestApuntesDesktop({
  notes,
  hasAnyNotes,
}: {
  notes: readonly HomeLatestApunte[]
  hasAnyNotes: boolean
}) {
  const newBadges = useSeenApuntes({ markOnViewport: false })

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
            Apuntes
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Últimos apuntes subidos
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/50">
          Material nuevo para repasar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {notes.length === 0 ? (
          <HomeLatestApuntesDesktopEmpty hasAnyNotes={hasAnyNotes} />
        ) : (
          notes.map((note) => {
            const seenApunteKey = `${note.id}:${note.updatedAt}`
            return (
            <DarkCard
              key={note.id}
              variant="interactive"
              className="group relative flex min-h-[176px] flex-col justify-between rounded-lg border border-white/5 bg-surface-1/60 p-4 backdrop-blur-sm"
              data-apunte-id={seenApunteKey}
              ref={(node) => newBadges.registerNode(seenApunteKey, node)}
              onPointerEnter={() => newBadges.startHoverTimer(seenApunteKey)}
              onPointerLeave={() => newBadges.clearHoverTimer(seenApunteKey)}
            >
              <Link
                href={buildLatestApunteHref(note)}
                aria-label={`Abrir ${note.subjectNombre}`}
                className="absolute inset-0 z-10 block cursor-pointer rounded-lg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] tracking-wider text-white/65">
                    {note.yearNombre}
                  </span>
                  <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] tracking-wider text-emerald-300">
                    {formatDate(note.updatedAt)}
                  </span>
                  {newBadges.isNew(seenApunteKey) ? <NewApunteBadge /> : null}
                </div>

                <div className="space-y-2">
                  <h3 className="line-clamp-2 text-lg font-black leading-tight tracking-tight text-white transition-colors group-hover:text-white">
                    {note.titulo}
                  </h3>
                  <p className="text-sm leading-6 text-white/58 transition-colors group-hover:text-white/70">
                    {note.subjectNombre}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-xs font-semibold text-white/45">
                Material nuevo para repasar
              </p>
            </DarkCard>
            )
          })
        )}
      </div>
    </section>
  )
}

function HomeLatestApuntesDesktopEmpty({ hasAnyNotes }: { hasAnyNotes: boolean }) {
  return (
    <DarkCard className="col-span-full flex flex-col items-center justify-center gap-2 border-dashed p-6 py-16 text-center text-sm leading-6 text-white/50">
      <FileText className="size-6 opacity-40" />
      <span>{getEmptyStateMessage(hasAnyNotes)}</span>
    </DarkCard>
  )
}

function HomeLatestApuntesDesktopSetupNotice() {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
            Apuntes
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Últimos apuntes subidos
          </h2>
        </div>
      </div>

      <DarkCard className="flex flex-col items-start gap-4 border-dashed p-6 sm:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/70">
          <FileText className="size-5" />
        </span>
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tight text-white">
            Elegí qué querés seguir
          </h3>
          <p className="max-w-xl text-sm leading-6 text-white/55">
            Configurá tus años y materias para ver material nuevo que te sirva de verdad.
          </p>
        </div>
        <Link
          href="/configurar"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-light"
        >
          <SlidersHorizontal className="size-4" />
          Configurar materias
        </Link>
      </DarkCard>
    </section>
  )
}

function HomeLatestApuntesDesktopSkeleton() {
  return (
    <section className="space-y-4" aria-hidden="true">
      <div className="px-1">
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-8 w-80 max-w-full animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <DarkCard key={item} className="min-h-[176px] rounded-lg p-4">
            <div className="h-full animate-pulse rounded bg-white/[0.04]" />
          </DarkCard>
        ))}
      </div>
    </section>
  )
}

function HomeLatestApuntesMobile({
  notes,
  hasAnyNotes,
}: {
  notes: readonly HomeLatestApunte[]
  hasAnyNotes: boolean
}) {
  const newBadges = useSeenApuntes({ markOnHover: false })

  return (
    <section className="flex flex-col gap-3">
      <div className="px-[18px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Apuntes</p>
        <h2 className="mt-1 text-lg font-black text-white">Últimos apuntes subidos</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/55">Material nuevo para repasar.</p>
      </div>

      <div className="px-[18px] flex flex-col gap-2.5">
        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-[#1a1a1a] p-4 text-center text-sm text-white/45">
            {getEmptyStateMessage(hasAnyNotes)}
          </div>
        ) : (
          notes.map((note) => {
            const seenApunteKey = `${note.id}:${note.updatedAt}`
            return (
            <Link
              key={note.id}
              href={buildLatestApunteHref(note)}
              data-apunte-id={seenApunteKey}
              ref={(node) => newBadges.registerNode(seenApunteKey, node)}
              onPointerEnter={() => newBadges.startHoverTimer(seenApunteKey)}
              onPointerLeave={() => newBadges.clearHoverTimer(seenApunteKey)}
              className="group flex cursor-pointer flex-col gap-3 rounded-[10px] border border-white/5 bg-[#1a1a1a] px-4 py-3 no-underline transition-colors hover:bg-[#1f1f1f]"
            >
              <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] tracking-wider text-white/65">
                  {note.yearNombre}
                </span>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] tracking-wider text-emerald-300">
                  {formatDate(note.updatedAt)}
                </span>
                {newBadges.isNew(seenApunteKey) ? <NewApunteBadge /> : null}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black leading-snug text-white">
                  {note.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-white/55 transition-colors group-hover:text-white/70">
                  {note.subjectNombre}
                </p>
              </div>
            </Link>
            )
          })
        )}
      </div>
    </section>
  )
}

function NewApunteBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-amber-200">
      <span className="size-1.5 rounded-full bg-orange-400" aria-hidden />
      Nuevo
    </span>
  )
}

function HomeLatestApuntesMobileSetupNotice() {
  return (
    <section className="flex flex-col gap-3">
      <div className="px-[18px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Apuntes</p>
        <h2 className="mt-1 text-lg font-black text-white">Últimos apuntes subidos</h2>
      </div>

      <div className="px-[18px]">
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-white/10 bg-[#1a1a1a] p-4">
          <span className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/70">
            <FileText className="size-4" />
          </span>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">
              Elegí tus materias
            </h3>
            <p className="text-sm leading-relaxed text-white/55">
              Configurá qué querés seguir para ver material nuevo hecho para vos.
            </p>
          </div>
          <Link
            href="/configurar"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-light"
          >
            <SlidersHorizontal className="size-4" />
            Configurar
          </Link>
        </div>
      </div>
    </section>
  )
}

function HomeLatestApuntesMobileSkeleton() {
  return (
    <section className="flex flex-col gap-3 px-[18px]" aria-hidden="true">
      <div>
        <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-7 w-52 animate-pulse rounded bg-white/[0.06]" />
      </div>
      {[0, 1].map((item) => (
        <div
          key={item}
          className="h-[116px] animate-pulse rounded-[10px] border border-white/5 bg-[#1a1a1a]"
        />
      ))}
    </section>
  )
}

function getEmptyStateMessage(hasAnyNotes: boolean) {
  return hasAnyNotes
    ? 'Con tu selección actual no aparece material nuevo todavía.'
    : 'Todavía no hay apuntes nuevos para mostrar.'
}
