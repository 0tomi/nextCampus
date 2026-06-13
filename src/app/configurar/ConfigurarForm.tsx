'use client'

import { useReducer } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check as CheckIcon, ChevronDown } from 'lucide-react'
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
  color?: string | null
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

function navigateHomeWithFreshState() {
  window.location.assign('/')
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

type ConfigState = {
  draft: UserPreferences
  expandedSubjects: string[]
}

type ConfigAction =
  | { type: 'toggle-year'; slug: string }
  | { type: 'toggle-subject'; slug: string }
  | { type: 'toggle-commission'; subjectSlug: string; commissionSlug: string }
  | { type: 'toggle-subject-commissions'; subjectSlug: string }

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function createConfigReducer(years: YearForConfig[]) {
  return function configReducer(state: ConfigState, action: ConfigAction): ConfigState {
    switch (action.type) {
      case 'toggle-year': {
        const targetYear = years.find((year) => year.slug === action.slug)
        if (!targetYear) return state

        const isCurrentlyHidden = state.draft.hiddenYears.includes(action.slug)
        const subjectSlugs: string[] = []
        const subjectsWithCommissions: string[] = []

        for (const subject of targetYear.subjects) {
          subjectSlugs.push(subject.slug)

          if (subject.commissions.length > 1) {
            subjectsWithCommissions.push(subject.slug)
          }
        }

        if (isCurrentlyHidden) {
          return {
            draft: {
              ...state.draft,
              hiddenYears: state.draft.hiddenYears.filter((slug) => slug !== action.slug),
              hiddenSubjects: state.draft.hiddenSubjects.filter(
                (slug) => !subjectSlugs.includes(slug),
              ),
            },
            expandedSubjects: unique([...state.expandedSubjects, ...subjectsWithCommissions]),
          }
        }

        return {
          draft: {
            ...state.draft,
            hiddenYears: [...state.draft.hiddenYears, action.slug],
            hiddenSubjects: unique([...state.draft.hiddenSubjects, ...subjectSlugs]),
          },
          expandedSubjects: state.expandedSubjects.filter(
            (slug) => !subjectSlugs.includes(slug),
          ),
        }
      }

      case 'toggle-subject': {
        const parentYear = years.find((year) =>
          year.subjects.some((subject) => subject.slug === action.slug),
        )
        if (!parentYear) return state

        const targetSubject = parentYear.subjects.find((subject) => subject.slug === action.slug)
        const isSubjectCurrentlyHidden = state.draft.hiddenSubjects.includes(action.slug)
        const nextHiddenYears = [...state.draft.hiddenYears]

        if (isSubjectCurrentlyHidden) {
          return {
            draft: {
              ...state.draft,
              hiddenSubjects: state.draft.hiddenSubjects.filter((slug) => slug !== action.slug),
              hiddenYears: nextHiddenYears.filter((slug) => slug !== parentYear.slug),
            },
            expandedSubjects:
              targetSubject && targetSubject.commissions.length > 1
                ? unique([...state.expandedSubjects, action.slug])
                : state.expandedSubjects,
          }
        }

        const nextHiddenSubjects = [...state.draft.hiddenSubjects, action.slug]
        const allSubjectsHidden = parentYear.subjects.every(
          (subject) =>
            subject.slug === action.slug || nextHiddenSubjects.includes(subject.slug),
        )

        if (allSubjectsHidden && !nextHiddenYears.includes(parentYear.slug)) {
          nextHiddenYears.push(parentYear.slug)
        }

        return {
          draft: {
            ...state.draft,
            hiddenSubjects: nextHiddenSubjects,
            hiddenYears: nextHiddenYears,
          },
          expandedSubjects: state.expandedSubjects.filter((slug) => slug !== action.slug),
        }
      }

      case 'toggle-commission': {
        const scopedKey = getCommissionPreferenceKey(action.subjectSlug, action.commissionSlug)
        const isHidden =
          state.draft.hiddenCommissions.includes(scopedKey) ||
          state.draft.hiddenCommissions.includes(action.commissionSlug)

        return {
          ...state,
          draft: {
            ...state.draft,
            hiddenCommissions: isHidden
              ? state.draft.hiddenCommissions.filter(
                  (slug) => slug !== scopedKey && slug !== action.commissionSlug,
                )
              : [...state.draft.hiddenCommissions, scopedKey],
          },
        }
      }

      case 'toggle-subject-commissions': {
        return {
          ...state,
          expandedSubjects: state.expandedSubjects.includes(action.subjectSlug)
            ? state.expandedSubjects.filter((slug) => slug !== action.subjectSlug)
            : [...state.expandedSubjects, action.subjectSlug],
        }
      }

      default:
        return state
    }
  }
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
  const [{ draft, expandedSubjects }, dispatch] = useReducer(
    createConfigReducer(years),
    {
      draft: initialPrefs,
      expandedSubjects: [],
    },
  )

  const toggleYear = (slug: string) => dispatch({ type: 'toggle-year', slug })
  const toggleSubject = (slug: string) => dispatch({ type: 'toggle-subject', slug })
  const toggleCommission = (subjectSlug: string, commissionSlug: string) =>
    dispatch({ type: 'toggle-commission', subjectSlug, commissionSlug })
  const toggleSubjectCommissions = (subjectSlug: string) =>
    dispatch({ type: 'toggle-subject-commissions', subjectSlug })

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
            const colors = getYearColorClasses({ slug: year.slug, color: year.color })
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
                  style={colors.style}
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
                        <div className="flex items-center gap-2 px-5 py-3.5 transition-colors hover:bg-white/5">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
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
                            <button
                              type="button"
                              aria-expanded={expandedSubjects.includes(subject.slug)}
                              aria-controls={`commissions-${subject.id}`}
                              disabled={!subjectChecked}
                              onClick={() => toggleSubjectCommissions(subject.slug)}
                              className={cn(
                                'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                                subjectChecked
                                  ? 'cursor-pointer border-white/10 text-white/50 hover:border-white/20 hover:bg-white/5 hover:text-white/80'
                                  : 'cursor-not-allowed border-white/5 text-white/20',
                              )}
                            >
                              Comisiones
                              <ChevronDown
                                className={cn(
                                  'size-3.5 transition-transform',
                                  expandedSubjects.includes(subject.slug) && 'rotate-180',
                                )}
                                aria-hidden
                              />
                            </button>
                          )}
                        </div>

                        {subject.commissions.length > 1 &&
                          subjectChecked &&
                          expandedSubjects.includes(subject.slug) && (
                          <ul
                            id={`commissions-${subject.id}`}
                            className="flex flex-col border-t border-white/5 bg-white/[0.02]"
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
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 pt-4 pb-[calc(1rem+var(--spacing-safe-bottom))] sm:px-6">
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
            const colors = getYearColorClasses({ slug: year.slug, color: year.color })

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
                  style={colors.style}
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
                      <div className="flex items-center gap-2 px-5 py-3.5 transition-colors hover:bg-white/5">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
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
                          <button
                            type="button"
                            disabled
                            className="flex shrink-0 cursor-not-allowed items-center gap-1 rounded-full border border-white/5 px-2.5 py-1 text-[11px] font-medium text-white/20"
                          >
                            Comisiones
                            <ChevronDown className="size-3.5" aria-hidden />
                          </button>
                        )}
                      </div>
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
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 pt-4 pb-[calc(1rem+var(--spacing-safe-bottom))] sm:px-6">
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
