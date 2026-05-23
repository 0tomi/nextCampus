'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check as CheckIcon } from 'lucide-react'
import { usePreferences } from '@/hooks/usePreferences'
import { EMPTY_PREFERENCES, type UserPreferences } from '@/lib/preferences'
import { getYearColorClasses } from '@/lib/yearColors'
import { cn } from '@/lib/utils'

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

function CheckBox({ checked, size = 'md' }: { checked: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-sm border transition-colors',
        size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        checked ? 'border-uader-red bg-uader-red' : 'border-white/20 bg-transparent',
      )}
    >
      {checked && (
        <CheckIcon
          className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-white')}
          strokeWidth={3}
        />
      )}
    </span>
  )
}

export function ConfigurarForm(props: ConfigurarFormProps) {
  const { prefs, isHydrated, setPrefs, clear } = usePreferences()

  if (!isHydrated) {
    return <ConfigurarFormSkeleton {...props} />
  }

  return (
    <ConfigurarFormInner
      {...props}
      initialPrefs={prefs ?? EMPTY_PREFERENCES}
      setPrefs={setPrefs}
      clear={clear}
    />
  )
}

function ConfigurarFormInner({
  careerName,
  years,
  initialPrefs,
  setPrefs,
  clear,
}: ConfigurarFormProps & {
  initialPrefs: UserPreferences
  setPrefs: (p: UserPreferences) => void
  clear: () => void
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<UserPreferences>(initialPrefs)

  const toggleYear = (slug: string) => {
    setDraft((d) => ({
      ...d,
      hiddenYears: d.hiddenYears.includes(slug)
        ? d.hiddenYears.filter((s) => s !== slug)
        : [...d.hiddenYears, slug],
    }))
  }

  const toggleSubject = (slug: string) => {
    setDraft((d) => ({
      ...d,
      hiddenSubjects: d.hiddenSubjects.includes(slug)
        ? d.hiddenSubjects.filter((s) => s !== slug)
        : [...d.hiddenSubjects, slug],
    }))
  }

  const toggleCommission = (slug: string) => {
    setDraft((d) => ({
      ...d,
      hiddenCommissions: d.hiddenCommissions.includes(slug)
        ? d.hiddenCommissions.filter((s) => s !== slug)
        : [...d.hiddenCommissions, slug],
    }))
  }

  const onSave = () => {
    setPrefs(draft)
    router.push('/')
  }

  const onResetAll = () => {
    clear()
    router.push('/')
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
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

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
                <ul
                  className={cn(
                    'flex flex-col transition-opacity',
                    !yearChecked && 'pointer-events-none opacity-40',
                  )}
                >
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
                            disabled={!yearChecked}
                          />
                          <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-uader-red peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
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
                              const commissionChecked = !draft.hiddenCommissions.includes(commission.slug)
                              return (
                                <li key={commission.id}>
                                  <label className="flex cursor-pointer items-center gap-3 pl-12 pr-5 py-2.5 transition-colors hover:bg-white/[0.03]">
                                    <input
                                      type="checkbox"
                                      className="peer sr-only"
                                      checked={commissionChecked}
                                      onChange={() => toggleCommission(commission.slug)}
                                      disabled={!yearChecked || !subjectChecked}
                                    />
                                    <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-uader-red peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
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
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
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
              className="cursor-pointer rounded-md bg-uader-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-uader-red-light"
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
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

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

        {/* Years grid — all checked by default, inputs disabled */}
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
                    checked
                    disabled
                    readOnly
                  />
                  <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent rounded-sm">
                    <CheckBox checked />
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
                        ({year.subjects.length} de {year.subjects.length})
                      </span>
                    </div>
                  </div>
                </label>

                <ul className="flex flex-col transition-opacity">
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
                          checked
                          disabled
                          readOnly
                        />
                        <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-uader-red peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
                          <CheckBox checked />
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
                                  checked
                                  disabled
                                  readOnly
                                />
                                <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-uader-red peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
                                  <CheckBox checked size="sm" />
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
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
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
              className="cursor-not-allowed rounded-md bg-uader-red px-5 py-2.5 text-sm font-semibold text-white opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
