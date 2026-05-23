'use client'

import Link from 'next/link'
import { Layers, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getYearColorClasses } from '@/lib/yearColors'
import { usePreferences } from '@/hooks/usePreferences'
import { isYearVisible, isSubjectVisible, type UserPreferences } from '@/lib/preferences'
import { AdminControls } from '@/components/admin/AdminControls'
import {
  YearAdminBar,
  SubjectAdminRow,
  AddSubjectButton,
} from '@/components/admin/HomeAdminOverlay'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'

interface HomeYearsGridProps {
  initialPrefs: UserPreferences | null
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

export function HomeYearsGrid({ initialPrefs, years }: HomeYearsGridProps) {
  const { prefs, isHydrated } = usePreferences(initialPrefs)
  const shouldWaitForStoredPrefs = !isHydrated && initialPrefs === null
  const effectivePrefs = isHydrated ? prefs : initialPrefs

  const yearsWithIndex = years.map((y, i) => ({ year: y, originalIndex: i }))

  if (shouldWaitForStoredPrefs) {
    return <HomeYearsGridSkeleton yearsCount={years.length} />
  }

  const visibleYears = yearsWithIndex
        .filter(({ year }) => isYearVisible(year.slug, effectivePrefs))
        .map(({ year, originalIndex }) => ({
          year: {
            ...year,
            subjects: year.subjects.filter((s) =>
              isSubjectVisible(year.slug, s.slug, effectivePrefs),
            ),
          },
          originalIndex,
        }))

  if (visibleYears.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-md border border-dashed border-white/10 bg-surface-1 px-6 py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
          Inicio personalizado
        </p>
        <h2 className="max-w-xl text-2xl font-bold text-white">
          No tenés años o materias visibles
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-white/55">
          Elegí los que querés ver en tu inicio desde la pantalla de personalización.
        </p>
        <Link
          href="/configurar"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-uader-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-uader-red-light"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Configurar
        </Link>
      </div>
    )
  }

  return (
    <div className="stagger-children grid gap-4 md:grid-cols-3 xl:grid-cols-5">
      {visibleYears.map(({ year, originalIndex }) => {
        const colors = getYearColorClasses(year.slug)

        return (
          <div
            key={year.id}
            id={`year-${year.slug}`}
            className="flex flex-col overflow-hidden rounded bg-surface-1"
          >
            <Link href={`/year/${year.slug}`} className="group block">
              <div className={cn('px-5 py-4 transition-opacity group-hover:opacity-90', colors.progressClassName)}>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/90">
                  Año {originalIndex + 1}
                </p>
                <h3 className="mt-1 text-base font-bold text-white">
                  {year.nombre}
                </h3>
              </div>
            </Link>

            <ul className="flex flex-col">
              {year.subjects.map((subject, subjectIndex) => (
                <li
                  key={subject.id}
                  className={cn(
                    subjectIndex !== year.subjects.length - 1 &&
                      'border-b border-white/5',
                  )}
                >
                  <Link
                    href={buildSubjectHref({
                      yearSlug: year.slug,
                      subjectSlug: subject.slug,
                    })}
                    className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/5"
                  >
                    <Layers className="h-[14px] w-[14px] shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/60 transition-colors group-hover:text-white">
                      {subject.nombre}
                    </span>
                    <AdminControls yearId={year.id}>
                      <SubjectAdminRow
                        subject={{
                          id: subject.id,
                          slug: subject.slug,
                          nombre: subject.nombre,
                          descripcion: subject.descripcion,
                          driveUrl: subject.driveUrl,
                        }}
                        yearId={year.id}
                      />
                    </AdminControls>
                  </Link>
                </li>
              ))}
              <AdminControls yearId={year.id}>
                <li>
                  <AddSubjectButton yearId={year.id} />
                </li>
              </AdminControls>
            </ul>

            <AdminControls requireGlobal>
              <YearAdminBar
                year={{
                  id: year.id,
                  slug: year.slug,
                  nombre: year.nombre,
                  orden: originalIndex + 1,
                  subjects: year.subjects.map((s) => ({
                    id: s.id,
                    slug: s.slug,
                    nombre: s.nombre,
                  })),
                }}
              />
            </AdminControls>
          </div>
        )
      })}
    </div>
  )
}

function HomeYearsGridSkeleton({ yearsCount }: { yearsCount: number }) {
  const items = Array.from({ length: Math.max(1, yearsCount) })

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5" aria-hidden="true">
      {items.map((_, index) => (
        <div
          key={index}
          className="flex min-h-[250px] flex-col overflow-hidden rounded bg-surface-1"
        >
          <div className="h-[84px] animate-pulse bg-white/[0.06]" />
          <div className="flex flex-col gap-3 px-5 py-4">
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  )
}
