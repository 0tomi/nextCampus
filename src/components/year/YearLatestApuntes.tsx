'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { DarkCard } from '@/components/ui/DarkCard'
import type { YearLatestApunteItem } from '@/lib/domain/year-page-adapters'
import { formatDate } from '@/lib/utils'

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
          <DarkCard className="col-span-full flex flex-col items-center justify-center gap-2 border-dashed p-6 py-16 text-center text-sm leading-6 text-white/50">
            <FileText className="size-6 opacity-40" />
            <span>Todavía no hay apuntes cargados en este año.</span>
          </DarkCard>
        ) : (
          notes.map((note) => (
            <DarkCard
              key={note.id}
              variant="interactive"
              className="group relative flex min-h-[176px] flex-col justify-between rounded-lg border border-white/5 bg-surface-1/60 p-4 backdrop-blur-sm"
            >
              <Link
                href={buildLatestApunteHref(note)}
                aria-label={`Abrir ${note.titulo}`}
                className="absolute inset-0 z-10 block cursor-pointer rounded-lg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] tracking-wider text-white/65">
                    {note.subjectNombre}
                  </span>
                  <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] tracking-wider text-emerald-300">
                    {formatDate(note.createdAt)}
                  </span>
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

function YearLatestApuntesMobile({ notes }: { notes: readonly YearLatestApunteItem[] }) {
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
          <div className="rounded-lg border border-dashed border-white/10 bg-[#1a1a1a] p-4 text-center text-sm text-white/45">
            Todavía no hay apuntes cargados en este año.
          </div>
        ) : (
          notes.map((note) => (
            <Link
              key={note.id}
              href={buildLatestApunteHref(note)}
              className="group flex cursor-pointer flex-col gap-3 rounded-[10px] border border-white/5 bg-[#1a1a1a] px-4 py-3 no-underline transition-colors hover:bg-[#1f1f1f]"
            >
              <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] tracking-wider text-white/65">
                  {note.subjectNombre}
                </span>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] tracking-wider text-emerald-300">
                  {formatDate(note.createdAt)}
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black leading-snug text-white">{note.titulo}</h3>
                <p className="text-sm leading-relaxed text-white/55 transition-colors group-hover:text-white/70">
                  {note.subjectNombre}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  )
}
