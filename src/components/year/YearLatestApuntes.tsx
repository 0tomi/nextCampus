'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { DarkCard } from '@/components/ui/DarkCard'
import type { YearLatestApunteItem } from '@/lib/domain/year-page-adapters'
import { formatDate } from '@/lib/utils'
import { useSeenApuntes } from '@/hooks/useSeenApuntes'

interface YearLatestApuntesProps {
  notes: readonly YearLatestApunteItem[]
  variant?: 'desktop' | 'mobile'
}

function buildLatestApunteHref(
  apunte: Pick<YearLatestApunteItem, 'yearSlug' | 'subjectSlug' | 'slug'>,
) {
  return `${buildSubjectHref({
    yearSlug: apunte.yearSlug,
    subjectSlug: apunte.subjectSlug,
  })}/apuntes/${apunte.slug}`
}

export function YearLatestApuntes({
  notes,
  variant = 'desktop',
}: YearLatestApuntesProps) {
  if (variant === 'mobile') {
    return <YearLatestApuntesMobile notes={notes} />
  }

  return <YearLatestApuntesDesktop notes={notes} />
}

function YearLatestApuntesDesktop({ notes }: { notes: readonly YearLatestApunteItem[] }) {
  const newBadges = useSeenApuntes()

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Apuntes
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Últimos apuntes subidos
          </h2>
        </div>
        <p className="max-w-xl text-sm text-white/48">
          Material reciente de este año para seguir estudiando.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notes.length === 0 ? (
          <YearLatestApuntesDesktopEmpty />
        ) : (
          notes.map((note) => (
            <DarkCard
              key={note.id}
              variant="interactive"
              className="group relative flex min-h-[176px] flex-col justify-between p-4"
              data-apunte-id={note.id}
              ref={(node) => newBadges.registerNode(note.id, node)}
              onPointerEnter={() => newBadges.startHoverTimer(note.id)}
              onPointerLeave={() => newBadges.clearHoverTimer(note.id)}
            >
              <Link
                href={buildLatestApunteHref(note)}
                aria-label={`Abrir ${note.titulo}`}
                className="absolute inset-0 z-10 block cursor-pointer no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] tracking-wider text-white/65">
                    {note.subjectNombre}
                  </span>
                  <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] tracking-wider text-emerald-300">
                    {formatDate(note.createdAt)}
                  </span>
                  {newBadges.isNew(note.id) ? <NewLatestApunteBadge /> : null}
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
                Material reciente para repasar
              </p>
            </DarkCard>
          ))
        )}
      </div>
    </section>
  )
}

function YearLatestApuntesDesktopEmpty() {
  return (
    <DarkCard className="col-span-full flex flex-col items-center justify-center gap-4 border-dashed px-6 py-16 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/70">
        <FileText className="size-5" />
      </span>
      <div className="space-y-2">
        <h3 className="text-2xl font-black tracking-tight text-white">
          Todavía no hay apuntes cargados
        </h3>
        <p className="max-w-xl text-sm leading-6 text-white/55">
          Cuando se sumen materiales nuevos para este año, van a aparecer acá para que los tengas a mano.
        </p>
      </div>
    </DarkCard>
  )
}

function YearLatestApuntesMobile({ notes }: { notes: readonly YearLatestApunteItem[] }) {
  const newBadges = useSeenApuntes()

  return (
    <section className="flex flex-col gap-3">
      <div className="px-[18px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Apuntes</p>
        <h2 className="mt-1 text-lg font-black text-white">Últimos apuntes subidos</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/55">
          Material reciente de este año para seguir estudiando.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 px-[18px]">
        {notes.length === 0 ? (
          <DarkCard className="flex flex-col items-start gap-4 border-dashed p-4">
            <span className="inline-flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/70">
              <FileText className="size-4" />
            </span>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">
                Todavía no hay apuntes cargados
              </h3>
              <p className="text-sm leading-relaxed text-white/55">
                Cuando aparezcan materiales nuevos de este año, los vas a ver acá.
              </p>
            </div>
          </DarkCard>
        ) : (
          notes.map((note) => (
            <DarkCard
              key={note.id}
              variant="interactive"
              className="group relative flex flex-col gap-3 p-4"
              data-apunte-id={note.id}
              ref={(node) => newBadges.registerNode(note.id, node)}
              onPointerEnter={() => newBadges.startHoverTimer(note.id)}
              onPointerLeave={() => newBadges.clearHoverTimer(note.id)}
            >
              <Link
                href={buildLatestApunteHref(note)}
                aria-label={`Abrir ${note.titulo}`}
                className="absolute inset-0 z-10 block cursor-pointer no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />

              <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] tracking-wider text-white/65">
                  {note.subjectNombre}
                </span>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] tracking-wider text-emerald-300">
                  {formatDate(note.createdAt)}
                </span>
                {newBadges.isNew(note.id) ? <NewLatestApunteBadge /> : null}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black leading-snug text-white">{note.titulo}</h3>
                <p className="text-sm leading-relaxed text-white/55 transition-colors group-hover:text-white/70">
                  {note.subjectNombre}
                </p>
              </div>
            </DarkCard>
          ))
        )}
      </div>
    </section>
  )
}

function NewLatestApunteBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-amber-200">
      <span className="size-1.5 rounded-full bg-orange-400" aria-hidden />
      Nuevo
    </span>
  )
}
