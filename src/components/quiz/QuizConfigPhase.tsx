'use client'

import { Check, ChevronRight, Trash2 } from 'lucide-react'
import { AdminControls } from '@/components/admin/AdminControls'
import { DarkCard } from '@/components/ui/DarkCard'
import { deleteQuizBankAction } from '@/app/admin/actions'
import { cn } from '@/lib/utils'
import { CONTROL, CONTROL_ACTIVE } from './quizStyles'
import { allowOnlyPositiveIntegerKeys } from './quizFormat'
import { useQuiz } from './QuizProvider'
import type { BancoInfo } from './quizTypes'

const COUNT_PRESETS = [
  { value: 30, label: '30' },
  { value: 50, label: '50' },
  { value: 0, label: 'Todas' },
]
const TIME_PRESETS = [30, 60, 120]

export function QuizConfigPhase() {
  const { actions, availableUnits, bancos, maxPreguntas, state, subjectSlug, yearId } = useQuiz()

  return (
    <DarkCard className="divide-y divide-white/[0.06]">
      <QuestionBankSection bancos={bancos} selectedBancos={state.selectedBancos} subjectSlug={subjectSlug} yearId={yearId} onToggle={actions.toggleBanco} />
      {availableUnits.length > 0 ? <UnitSelectorSection availableUnits={availableUnits} excludedUnits={state.excludedUnits} onToggle={actions.toggleUnit} /> : null}
      <QuizSettingsSection maxPreguntas={maxPreguntas} />
      <StartQuizSection canStart={state.selectedBancos.length > 0 && maxPreguntas > 0} />
    </DarkCard>
  )
}

function QuestionBankSection({
  bancos,
  selectedBancos,
  subjectSlug,
  yearId,
  onToggle,
}: {
  bancos: BancoInfo[]
  selectedBancos: string[]
  subjectSlug: string
  yearId?: string
  onToggle: (id: string) => void
}) {
  return (
    <section className="space-y-4 p-6 sm:p-8">
      <div>
        <h2 className="text-sm font-bold text-white">Bancos de preguntas</h2>
        <p className="mt-1 text-sm text-white/48">Elegí uno o combiná varios para mezclar sus preguntas.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {bancos.map((banco) => (
          <QuestionBankCard key={banco.id} banco={banco} active={selectedBancos.includes(banco.id)} subjectSlug={subjectSlug} yearId={yearId} onToggle={() => onToggle(banco.id)} />
        ))}
      </div>
    </section>
  )
}

function QuestionBankCard({
  banco,
  active,
  subjectSlug,
  yearId,
  onToggle,
}: {
  banco: BancoInfo
  active: boolean
  subjectSlug: string
  yearId?: string
  onToggle: () => void
}) {
  return (
    <div className={cn('group relative flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors', active ? CONTROL_ACTIVE : CONTROL)}>
      <button type="button" onClick={onToggle} className="absolute inset-0 size-full cursor-pointer text-left" aria-pressed={active}>
        <span className="sr-only">Seleccionar {banco.nombre}</span>
      </button>

      <div className="relative min-w-0 pointer-events-none z-10">
        <span className="block truncate text-sm font-semibold text-white">{banco.nombre}</span>
        <span className="mt-0.5 block text-xs text-white/44">{banco.totalPreguntas} preguntas</span>
      </div>

      <div className="relative flex items-center gap-2 z-10">
        <AdminControls yearId={yearId} noWrapper>
          <form action={deleteQuizBankAction} className="flex">
            <input type="hidden" name="subjectSlug" value={subjectSlug} />
            <input type="hidden" name="bankId" value={banco.id} />
            <button type="submit" className="flex size-7 items-center justify-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white cursor-pointer" title="Eliminar banco de preguntas">
              <Trash2 className="size-4 text-rose-400" />
            </button>
          </form>
        </AdminControls>
        <span className={cn('flex size-5 shrink-0 items-center justify-center transition-colors pointer-events-none', active ? 'bg-primary text-white' : 'border border-white/15')}>
          {active ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>
      </div>
    </div>
  )
}

function UnitSelectorSection({
  availableUnits,
  excludedUnits,
  onToggle,
}: {
  availableUnits: Array<{ nombre: string; totalPreguntas: number }>
  excludedUnits: string[]
  onToggle: (nombre: string) => void
}) {
  return (
    <section className="space-y-4 p-6 sm:p-8">
      <div>
        <h2 className="text-sm font-bold text-white">Elegir unidades</h2>
        <p className="mt-1 text-sm text-white/48">De los bancos seleccionados, elegí qué unidades querés utilizar para autoevaluarte.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {availableUnits.map((unit) => {
          const active = !excludedUnits.includes(unit.nombre)
          return <UnitToggleCard key={unit.nombre} unit={unit} active={active} onToggle={() => onToggle(unit.nombre)} />
        })}
      </div>
    </section>
  )
}

function UnitToggleCard({ unit, active, onToggle }: { unit: { nombre: string; totalPreguntas: number }; active: boolean; onToggle: () => void }) {
  return (
    <div className={cn('group relative flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors', active ? CONTROL_ACTIVE : CONTROL)}>
      <button type="button" onClick={onToggle} className="absolute inset-0 size-full cursor-pointer text-left" aria-pressed={active}>
        <span className="sr-only">Seleccionar {unit.nombre}</span>
      </button>
      <div className="relative min-w-0 pointer-events-none z-10">
        <span className="block truncate text-sm font-semibold text-white">{unit.nombre}</span>
        <span className="mt-0.5 block text-xs text-white/44">{unit.totalPreguntas} preguntas</span>
      </div>
      <span className={cn('flex size-5 shrink-0 items-center justify-center transition-colors pointer-events-none z-10', active ? 'bg-primary text-white' : 'border border-white/15')}>
        {active ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </div>
  )
}

function QuizSettingsSection({ maxPreguntas }: { maxPreguntas: number }) {
  const { actions, state } = useQuiz()

  return (
    <section className={cn('grid gap-8 p-6 sm:p-8', state.mode === 'examen' ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      <ModeSelector />
      <QuestionCountField count={state.count} maxPreguntas={maxPreguntas} onChange={actions.setCount} />
      {state.mode === 'examen' ? <TimeLimitField timeLimit={state.timeLimit} onChange={actions.setTimeLimit} /> : null}
    </section>
  )
}

function ModeSelector() {
  const { actions, state } = useQuiz()

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-white">Modo</h2>
      <div className="grid grid-cols-2 gap-2">
        {([
          ['practica', 'Práctica'],
          ['examen', 'Examen'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => actions.setMode(value)} className={cn('px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer', state.mode === value ? `${CONTROL_ACTIVE} text-white` : `${CONTROL} text-white/60`)}>
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs leading-5 text-white/40">{state.mode === 'practica' ? 'Corregís cada pregunta al instante y ves la explicación.' : 'Respondés todo y ves el resultado al final.'}</p>
    </div>
  )
}

function QuestionCountField({ count, maxPreguntas, onChange }: { count: number; maxPreguntas: number; onChange: (count: number) => void }) {
  return (
    <div className="space-y-3">
      <label htmlFor="count" className="block text-sm font-bold text-white">Cantidad de preguntas</label>
      <input
        id="count"
        type="number"
        min={0}
        max={maxPreguntas || undefined}
        value={count === 0 ? '' : count}
        placeholder="0"
        onKeyDown={allowOnlyPositiveIntegerKeys}
        onChange={(event) => onChange(parsePositiveInteger(event.target.value, 0))}
        className="block w-full border border-white/[0.06] bg-surface-3 px-3 py-2.5 text-sm text-white tabular-nums focus:border-primary/45 focus:outline-none"
      />
      <PresetButtons options={COUNT_PRESETS} current={count} maxPreguntas={maxPreguntas} onChange={onChange} />
      <p className="text-xs leading-5 text-white/40">0 = todas{maxPreguntas > 0 ? ` · hasta ${maxPreguntas}` : ''}.</p>
    </div>
  )
}

function TimeLimitField({ timeLimit, onChange }: { timeLimit: number; onChange: (minutes: number) => void }) {
  return (
    <div className="space-y-3">
      <label htmlFor="timeLimit" className="block text-sm font-bold text-white">Tiempo de examen (minutos)</label>
      <input
        id="timeLimit"
        type="number"
        min={1}
        value={timeLimit === 0 ? '' : timeLimit}
        placeholder="60"
        onKeyDown={allowOnlyPositiveIntegerKeys}
        onChange={(event) => onChange(parsePositiveInteger(event.target.value, 60, 1))}
        className="block w-full border border-white/[0.06] bg-surface-3 px-3 py-2.5 text-sm text-white tabular-nums focus:border-primary/45 focus:outline-none"
      />
      <div className="flex flex-wrap gap-2 pt-1">
        {TIME_PRESETS.map((minutes) => (
          <button key={minutes} type="button" onClick={() => onChange(minutes)} className={cn('px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer', timeLimit === minutes ? `${CONTROL_ACTIVE} text-white` : `${CONTROL} text-white/60`)}>
            {minutes} min
          </button>
        ))}
      </div>
    </div>
  )
}

function PresetButtons({
  current,
  maxPreguntas,
  onChange,
  options,
}: {
  current: number
  maxPreguntas: number
  onChange: (value: number) => void
  options: typeof COUNT_PRESETS
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map((option) => {
        const disabled = option.value > 0 && maxPreguntas > 0 && maxPreguntas < option.value
        return (
          <button key={option.value} type="button" disabled={disabled} onClick={() => onChange(option.value)} className={cn('px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30', current === option.value ? `${CONTROL_ACTIVE} text-white` : `${CONTROL} text-white/60`)}>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function StartQuizSection({ canStart }: { canStart: boolean }) {
  const { actions, state } = useQuiz()

  return (
    <section className="space-y-4 p-6 sm:p-8">
      {state.error ? <p className="border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{state.error}</p> : null}
      <button type="button" onClick={actions.start} disabled={state.loading || !canStart} className="inline-flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
        {state.loading ? 'Cargando…' : 'Comenzar quiz'}
        <ChevronRight className="size-4" />
      </button>
    </section>
  )
}

function parsePositiveInteger(value: string, fallback: number, minimum = 0) {
  if (value === '') return fallback
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : Math.max(minimum, parsed)
}
