'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check as CheckIcon } from 'lucide-react'
import { usePreferences } from '@/hooks/usePreferences'
import {
  EMPTY_PREFERENCES,
  getCommissionPreferenceKey,
  type UserPreferences,
} from '@/lib/preferences'
import { getYearColorClasses } from '@/lib/yearColors'
import { cn } from '@/lib/utils'
import { InstallPWASettingsCard } from '@/components/pwa/InstallPWA'

type CommissionForConfig = { id: string; slug: string; nombre: string }

type YearForConfig = {
  id: string
  slug: string
  nombre: string
  subjects: Array<{
    id: string
    slug: string
    nombre: string
    commissions: CommissionForConfig[]
  }>
}

interface ConfigurarFormProps {
  careerName: string
  years: YearForConfig[]
}

function buildNewDevicePreferences(years: YearForConfig[]): UserPreferences {
  return {
    hiddenYears: years.map((year) => year.slug),
    hiddenSubjects: years.flatMap((year) =>
      year.subjects.map((subject) => subject.slug),
    ),
    hiddenCommissions: [],
  }
}

function CheckBox({ checked, size = 'md' }: { checked: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-sm border transition-colors',
        size === 'sm' ? 'size-4' : 'size-5',
        checked ? 'border-primary bg-primary' : 'border-white/20 bg-transparent',
      )}
    >
      {checked && (
        <CheckIcon
          className={cn(size === 'sm' ? 'size-3' : 'size-3.5', 'text-white')}
          strokeWidth={3}
        />
      )}
    </span>
  )
}

export function ConfigurarForm(props: ConfigurarFormProps) {
  const { prefs, isHydrated, setPrefs } = usePreferences()

  if (!isHydrated) {
    return <ConfigurarFormSkeleton {...props} />
  }

  return (
    <ConfigurarFormInner
      {...props}
      initialPrefs={prefs ?? buildNewDevicePreferences(props.years)}
      setPrefs={setPrefs}
    />
  )
}

function ConfigurarFormInner({
  careerName,
  years,
  initialPrefs,
  setPrefs,
}: ConfigurarFormProps & {
  initialPrefs: UserPreferences
  setPrefs: (p: UserPreferences) => void
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<UserPreferences>(initialPrefs)

  const navigateHomeWithFreshState = () => {
    window.location.assign('/')
  }

  const toggleYear = (slug: string) => {
    const targetYear = years.find((y) => y.slug === slug)
    if (!targetYear) return

    setDraft((d) => {
      const isCurrentlyHidden = d.hiddenYears.includes(slug)
      const subjectSlugs = targetYear.subjects.map((s) => s.slug)

      if (isCurrentlyHidden) {
        return {
          ...d,
          hiddenYears: d.hiddenYears.filter((s) => s !== slug),
          hiddenSubjects: d.hiddenSubjects.filter((s) => !subjectSlugs.includes(s)),
        }
      } else {
        const newHiddenSubjects = Array.from(
          new Set([...d.hiddenSubjects, ...subjectSlugs])
        )
        return {
          ...d,
          hiddenYears: [...d.hiddenYears, slug],
          hiddenSubjects: newHiddenSubjects,
        }
      }
    })
  }

  const toggleSubject = (slug: string) => {
    const parentYear = years.find((y) => y.subjects.some((s) => s.slug === slug))
    if (!parentYear) return

    setDraft((d) => {
      const isSubjectCurrentlyHidden = d.hiddenSubjects.includes(slug)
      let newHiddenSubjects: string[]
      let newHiddenYears = [...d.hiddenYears]

      if (isSubjectCurrentlyHidden) {
        newHiddenSubjects = d.hiddenSubjects.filter((s) => s !== slug)
        newHiddenYears = newHiddenYears.filter((y) => y !== parentYear.slug)
      } else {
        newHiddenSubjects = [...d.hiddenSubjects, slug]
        const allSubjectsHidden = parentYear.subjects.every(
          (s) => s.slug === slug || newHiddenSubjects.includes(s.slug)
        )
        if (allSubjectsHidden && !newHiddenYears.includes(parentYear.slug)) {
          newHiddenYears.push(parentYear.slug)
        }
      }

      return {
        ...d,
        hiddenSubjects: newHiddenSubjects,
        hiddenYears: newHiddenYears,
      }
    })
  }

  const toggleCommission = (subjectSlug: string, commissionSlug: string) => {
    const scopedKey = getCommissionPreferenceKey(subjectSlug, commissionSlug)

    setDraft((d) => {
      const isHidden =
        d.hiddenCommissions.includes(scopedKey) ||
        d.hiddenCommissions.includes(commissionSlug)

      return {
        ...d,
        hiddenCommissions: isHidden
          ? d.hiddenCommissions.filter(
              (s) => s !== scopedKey && s !== commissionSlug,
            )
          : [...d.hiddenCommissions, scopedKey],
      }
    })
  }

  const onSave = () => {
    setPrefs(draft)
    navigateHomeWithFreshState()
  }

  const onResetAll = () => {
    setPrefs(EMPTY_PREFERENCES)
    navigateHomeWithFreshState()
  }

  const onCancel = () => router.push('/')

  return (
    <div className="min-h-screen bg-surface-0">
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:px-6">
        {/* Header */}
        <div className="mb-10 space-y-4">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>

          <InstallPWASettingsCard />

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
              Personalización
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Elegí qué ver en tu inicio
            </h1>
            <p className="text-base text-white/55">
              Marcá los años y materias que querés que aparezcan. Esta
              configuración se guarda en este dispositivo.
            </p>
          </div>
        </div>

        {/* Years grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {years.map((year, index) => {
            const colors = getYearColorClasses(year.slug)
            const yearChecked = !draft.hiddenYears.includes(year.slug)
            const visibleSubjectsCount = year.subjects.filter(
              (s) => !draft.hiddenSubjects.includes(s.slug),
            ).length

            return (
              <div
                key={year.id}
                className="overflow-hidden rounded-md border border-white/5 bg-surface-1"
              >
                {/* Year header with checkbox */}
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-4 px-5 py-4 transition-opacity hover:opacity-90',
                    colors.progressClassName,
                  )}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={yearChecked}
                    onChange={() => toggleYear(year.slug)}
                  />
                  <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent rounded-sm">
                    <CheckBox checked={yearChecked} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/80">
                      Año {index + 1}
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <h3 className="text-base font-bold text-white">
                        {year.nombre}
                      </h3>
                      <span className="text-xs text-white/60">
                        ({visibleSubjectsCount} de {year.subjects.length})
                      </span>
                    </div>
                  </div>
                </label>

                {/* Subject list */}
                <ul className="flex flex-col transition-opacity">
                  {year.subjects.map((subject, subjectIndex) => {
                    const subjectChecked = !draft.hiddenSubjects.includes(subject.slug)

                    return (
                      <li
                        key={subject.id}
                        className={cn(
                          subjectIndex !== year.subjects.length - 1 &&
                            'border-b border-white/5',
                        )}
                      >
                        <label className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/5">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={subjectChecked}
                            onChange={() => toggleSubject(subject.slug)}
                          />
                          <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
                            <CheckBox checked={subjectChecked} />
                          </span>
                          <span className="min-w-0 flex-1 text-[13px] font-medium text-white/70">
                            {subject.nombre}
                          </span>
                        </label>

                        {subject.commissions.length > 1 && (
                          <ul
                            className={cn(
                              'flex flex-col bg-white/[0.02] border-t border-white/5',
                              !subjectChecked && 'opacity-50 pointer-events-none',
                            )}
                          >
                            {subject.commissions.map((commission) => {
                              const commissionPreferenceKey = getCommissionPreferenceKey(
                                subject.slug,
                                commission.slug,
                              )
                              const commissionChecked =
                                !draft.hiddenCommissions.includes(commissionPreferenceKey) &&
                                !draft.hiddenCommissions.includes(commission.slug)
                              return (
                                <li key={commission.id}>
                                  <label className="flex cursor-pointer items-center gap-3 pl-12 pr-5 py-2.5 transition-colors hover:bg-white/[0.03]">
                                    <input
                                      type="checkbox"
                                      className="peer sr-only"
                                      checked={commissionChecked}
                                      onChange={() => toggleCommission(subject.slug, commission.slug)}
                                      disabled={!subjectChecked}
                                    />
                                    <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
                                      <CheckBox checked={commissionChecked} size="sm" />
                                    </span>
                                    <span className="min-w-0 flex-1 text-[12px] text-white/55">
                                      Comisión {commission.nombre}
                                    </span>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-surface-0/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 p-4 sm:px-6">
          <p className="hidden text-xs text-white/30 sm:block">
            {careerName}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer px-3 py-2.5 text-sm text-white/50 transition-colors hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onResetAll}
              className="cursor-pointer rounded-md border border-white/10 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              Mostrar todo
            </button>
            <button
              type="button"
              onClick={onSave}
              className="cursor-pointer rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfigurarFormSkeleton({ careerName, years }: ConfigurarFormProps) {
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:px-6">
        {/* Header */}
        <div className="mb-10 space-y-4">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>

          <InstallPWASettingsCard />

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
              Personalización
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Elegí qué ver en tu inicio
            </h1>
            <p className="text-base text-white/55">
              Marcá los años y materias que querés que aparezcan. Esta
              configuración se guarda en este dispositivo.
            </p>
          </div>
        </div>

        <InstallPWASettingsCard className="mb-8" />

        {/* Years grid — default empty selection while loading */}
        <div className="grid gap-4 lg:grid-cols-2">
          {years.map((year, index) => {
            const colors = getYearColorClasses(year.slug)

            return (
              <div
                key={year.id}
                className="overflow-hidden rounded-md border border-white/5 bg-surface-1"
              >
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-4 px-5 py-4 transition-opacity hover:opacity-90',
                    colors.progressClassName,
                  )}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={false}
                    disabled
                    readOnly
                  />
                  <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent rounded-sm">
                    <CheckBox checked={false} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/80">
                      Año {index + 1}
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <h3 className="text-base font-bold text-white">
                        {year.nombre}
                      </h3>
                      <span className="text-xs text-white/60">
                        (0 de {year.subjects.length})
                      </span>
                    </div>
                  </div>
                </label>

                <ul className="flex flex-col pointer-events-none opacity-40 transition-opacity">
                  {year.subjects.map((subject, subjectIndex) => (
                    <li
                      key={subject.id}
                      className={cn(
                        subjectIndex !== year.subjects.length - 1 &&
                          'border-b border-white/5',
                      )}
                    >
                      <label className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/5">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={false}
                          disabled
                          readOnly
                        />
                        <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
                          <CheckBox checked={false} />
                        </span>
                        <span className="min-w-0 flex-1 text-[13px] font-medium text-white/70">
                          {subject.nombre}
                        </span>
                      </label>

                      {subject.commissions.length > 1 && (
                        <ul className="flex flex-col bg-white/[0.02] border-t border-white/5">
                          {subject.commissions.map((commission) => (
                            <li key={commission.id}>
                              <label className="flex cursor-pointer items-center gap-3 pl-12 pr-5 py-2.5 transition-colors hover:bg-white/[0.03]">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={false}
                                  disabled
                                  readOnly
                                />
                                <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
                                  <CheckBox checked={false} size="sm" />
                                </span>
                                <span className="min-w-0 flex-1 text-[12px] text-white/55">
                                  Comisión {commission.nombre}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-surface-0/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 p-4 sm:px-6">
          <p className="hidden text-xs text-white/30 sm:block">
            {careerName}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="cursor-pointer px-3 py-2.5 text-sm text-white/50 transition-colors hover:text-white"
            >
              Cancelar
            </Link>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-white/10 px-4 py-2.5 text-sm text-white/70 opacity-40"
            >
              Mostrar todo
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
