'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Layers, SlidersHorizontal, ArrowRight, Plus, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getYearColorClasses } from '@/lib/yearColors'
import { usePreferences } from '@/hooks/usePreferences'
import type { UserPreferences } from '@/lib/preferences'
import { AdminControls } from '@/components/admin/AdminControls'
import {
  YearAdminBar,
  SubjectAdminRow,
  AddYearButton,
  AddSubjectButton,
} from '@/components/admin/HomeAdminOverlay'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'
import { DarkCard } from '@/components/ui/DarkCard'
import { SubjectModal } from '@/components/admin/SubjectModal'
import { useAdminAccess } from '@/components/admin/adminAccess'
import {
  getHomeYearsForDisplay,
  type HomeGridYear,
} from './HomeYearsGrid.utils'

interface HomeYearsGridProps {
  initialPrefs: UserPreferences | null
  years: HomeGridYear[]
}

export function HomeYearsGrid({ initialPrefs, years }: HomeYearsGridProps) {
  const [showHiddenYears, setShowHiddenYears] = useState(false)
  const { prefs, isHydrated } = usePreferences(initialPrefs)
  const isAdmin = useAdminAccess()
  const shouldWaitForStoredPrefs = !isHydrated && initialPrefs === null
  const effectivePrefs = isHydrated ? prefs : initialPrefs

  if (shouldWaitForStoredPrefs) {
    return <HomeYearsGridSkeleton yearsCount={years.length} />
  }

  const visibleYears = getHomeYearsForDisplay({
    years,
    prefs: effectivePrefs,
    isAdmin,
    showHiddenYears,
  })

  const adminControls = isAdmin ? (
    <div className="flex flex-wrap justify-end gap-2">
      <AdminControls requireGlobal noWrapper>
        <AddYearButton />
      </AdminControls>
      <button
        type="button"
        onClick={() => setShowHiddenYears((current) => !current)}
        className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        <EyeOff className="size-3.5" />
        {showHiddenYears ? 'Ocultar años ocultos' : 'Mostrar años ocultos'}
      </button>
    </div>
  ) : null

  if (visibleYears.length === 0) {
    return (
      <div className="space-y-5">
        {adminControls}
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
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            <SlidersHorizontal className="size-4" />
            Configurar
          </Link>
        </div>
      </div>
    )
  }

  const totalVisibleSubjects = visibleYears.reduce(
    (sum, { year }) => sum + year.subjects.length,
    0,
  )

  if (totalVisibleSubjects < 10) {
    return (
      <div className="space-y-5">
        {adminControls}
        <div className="space-y-12">
          {visibleYears.map(({ year, originalIndex, isHiddenByPrefs }) => (
            <HomeYearCardSection
              key={year.id}
              year={year}
              originalIndex={originalIndex}
              isHiddenByPrefs={isHiddenByPrefs}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {adminControls}
      <div className="stagger-children grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {visibleYears.map(({ year, originalIndex, isHiddenByPrefs }) => {
          const colors = getYearColorClasses({ slug: year.slug, color: year.color })

          return (
            <div
              key={year.id}
              id={`year-${year.slug}`}
              className={cn(
                'flex flex-col overflow-hidden rounded bg-surface-1 transition-opacity',
                isHiddenByPrefs && 'opacity-55',
              )}
            >
              <Link href={`/${year.slug}`} className="group block">
                <div
                  className={cn(
                    'px-5 py-4 transition-opacity group-hover:opacity-90',
                    colors.progressClassName,
                  )}
                  style={colors.style}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/90">
                      Año {originalIndex + 1}
                    </p>
                    {isHiddenByPrefs ? (
                      <span className="inline-flex items-center rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80">
                        Oculto
                      </span>
                    ) : null}
                  </div>
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
                      <Layers className="size-[14px] shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/60 transition-colors group-hover:text-white">
                        {subject.nombre}
                      </span>
                      <AdminControls requireAcademicStructure>
                        <SubjectAdminRow
                          subject={{
                            id: subject.id,
                            slug: subject.slug,
                            nombre: subject.nombre,
                            descripcion: subject.descripcion,
                            links: subject.links,
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
                    descripcion: year.descripcion,
                    links: year.links,
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

function AddSubjectCard({ yearId }: { yearId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-full min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-white/10 bg-surface-1/40 hover:bg-surface-1/70 hover:border-white/20 text-white/40 hover:text-white/60 transition-all p-5"
      >
        <Plus className="size-5" />
        <span className="text-xs font-bold uppercase tracking-wider">Agregar Materia</span>
      </button>

      <SubjectModal
        open={open}
        onClose={() => setOpen(false)}
        yearId={yearId}
      />
    </>
  )
}

interface HomeYearCardSectionProps {
  year: HomeGridYear
  originalIndex: number
  isHiddenByPrefs: boolean
}

function HomeYearCardSection({
  year,
  originalIndex,
  isHiddenByPrefs,
}: HomeYearCardSectionProps) {
  const colors = getYearColorClasses({ slug: year.slug, color: year.color })
  const hasSubjects = year.subjects.length > 0
  const isAdmin = useAdminAccess({ yearId: year.id })

  if (!hasSubjects && !isAdmin) return null

  return (
    <div
      id={`year-${year.slug}`}
      className={cn('space-y-4 transition-opacity', isHiddenByPrefs && 'opacity-55')}
    >
      {/* Encabezado del Año (clickable para navegar) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
        <Link href={`/${year.slug}`} className="group inline-flex flex-col">
          <h3
            className={cn(
              'flex items-center gap-2 text-lg font-bold transition-colors',
              colors.textClassName,
              'group-hover:opacity-80',
            )}
            style={colors.style}
          >
            {year.nombre}
            <ArrowRight className="size-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </h3>
        </Link>

        <div className="flex items-center gap-3">
          {isHiddenByPrefs ? (
            <span className="inline-flex items-center rounded-full border border-white/12 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
              Oculto
            </span>
          ) : null}
          <AdminControls requireGlobal>
            <YearAdminBar
              year={{
                id: year.id,
                slug: year.slug,
                nombre: year.nombre,
                descripcion: year.descripcion,
                links: year.links,
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
      </div>

      {/* Grid de Materias en formato Tarjeta */}
      {!hasSubjects ? (
        <AdminControls requireAcademicStructure>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <AddSubjectCard yearId={year.id} />
          </div>
        </AdminControls>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {year.subjects.map((subject, index) => (
            <Link
              key={subject.id}
              href={buildSubjectHref({
                yearSlug: year.slug,
                subjectSlug: subject.slug,
              })}
              className="group"
            >
              <DarkCard
                variant="interactive"
                className="flex h-full flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38 flex items-center gap-2">
                        <span>Materia {String(index + 1).padStart(2, '0')}</span>
                        <AdminControls requireAcademicStructure noWrapper>
                          <span
                            className="pointer-events-auto flex items-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                          >
                            <SubjectAdminRow
                              subject={{
                                id: subject.id,
                                slug: subject.slug,
                                nombre: subject.nombre,
                                descripcion: subject.descripcion,
                                links: subject.links,
                              }}
                              yearId={year.id}
                            />
                          </span>
                        </AdminControls>
                      </p>
                    </div>

                    <span
                      className={cn(
                        'inline-flex h-10 min-w-10 shrink-0 items-center justify-center px-3 text-xs font-black tracking-[0.16em] text-white',
                        colors.progressClassName,
                      )}
                      style={colors.style}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-black tracking-tight text-white leading-tight">
                    {subject.nombre}
                  </h3>

                  {subject.descripcion && (
                    <p className="mt-2 text-sm leading-relaxed text-white/55 line-clamp-2">
                      {subject.descripcion}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between text-sm font-semibold text-white/58 transition-colors group-hover:text-white/80">
                  <span>Abrir materia</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </DarkCard>
            </Link>
          ))}

          <AdminControls yearId={year.id}>
            <AddSubjectCard yearId={year.id} />
          </AdminControls>
        </div>
      )}
    </div>
  )
}
