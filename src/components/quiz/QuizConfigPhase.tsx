'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminControls } from '@/components/admin/AdminControls'
import { DarkCard } from '@/components/ui/DarkCard'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { UploaderByline } from '@/components/ui/UploaderByline'
import { deleteQuizBankAction } from '@/app/admin/actions/quiz'
import { cn } from '@/lib/utils'
import { CONTROL, CONTROL_ACTIVE } from './quizStyles'
import { allowOnlyPositiveIntegerKeys, formatQuizTime } from './quizFormat'
import { isRankedBankEligible } from '@/lib/domain/ranked-quiz'
import { RankedHistoryLink } from './RankedHistory'
import { useQuiz } from './QuizProvider'
import type { BancoInfo, RankedTopItem } from './quizTypes'

const COUNT_PRESETS = [
  { value: 30, label: '30' },
  { value: 50, label: '50' },
  { value: 0, label: 'Todas' },
]
const TIME_PRESETS = [30, 60, 120]

export function QuizConfigPhase() {
  const { actions, availableUnits, bancos, maxPreguntas, rankedSelectedBank, state, subjectSlug, yearId } = useQuiz()
  const rankedCanStart = state.mode === 'ranked' && Boolean(rankedSelectedBank && isRankedBankEligible(rankedSelectedBank.totalPreguntas))
  const regularCanStart = state.mode !== 'ranked' && state.selectedBancos.length > 0 && maxPreguntas > 0

  return (
    <DarkCard className="divide-y divide-white/[0.06]">
      <QuestionBankSection bancos={bancos} rankedMode={state.mode === 'ranked'} selectedBancos={state.selectedBancos} subjectSlug={subjectSlug} yearId={yearId} onToggle={actions.toggleBanco} />
      {state.mode !== 'ranked' && availableUnits.length > 0 ? (
        <AnimateIn>
          <UnitSelectorSection availableUnits={availableUnits} excludedUnits={state.excludedUnits} onToggle={actions.toggleUnit} />
        </AnimateIn>
      ) : null}
      <QuizSettingsSection maxPreguntas={maxPreguntas} />
      {state.mode === 'ranked' ? (
        <AnimateIn>
          <RankedInfoSection />
        </AnimateIn>
      ) : null}
      <StartQuizSection canStart={rankedCanStart || regularCanStart} />
    </DarkCard>
  )
}

function QuestionBankSection({
  bancos,
  rankedMode,
  selectedBancos,
  subjectSlug,
  yearId,
  onToggle,
}: {
  bancos: BancoInfo[]
  rankedMode: boolean
  selectedBancos: string[]
  subjectSlug: string
  yearId?: string
  onToggle: (id: string) => void
}) {
  const [bancoToDelete, setBancoToDelete] = useState<BancoInfo | null>(null)
  const [isDeleting, startTransition] = useTransition()

  const handleConfirmDelete = () => {
    if (!bancoToDelete) return
    const idToDelete = bancoToDelete.id
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('subjectSlug', subjectSlug)
        formData.append('bankId', idToDelete)
        await deleteQuizBankAction(formData)
        if (selectedBancos.includes(idToDelete)) {
          onToggle(idToDelete)
        }
        toast.success('Banco de preguntas eliminado')
        setBancoToDelete(null)
      } catch {
        toast.error('No pudimos eliminar el banco. Probá de nuevo.')
      }
    })
  }

  return (
    <section className="space-y-4 p-6 sm:p-8">
      <div>
        <h2 className="text-sm font-bold text-white">Bancos de preguntas</h2>
        <p className="mt-1 text-sm text-white/48">{rankedMode ? 'Elegí un banco para competir por el top.' : 'Elegí uno o combiná varios para mezclar sus preguntas.'}</p>
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {bancos.map((banco) => (
          <QuestionBankCard
            key={banco.id}
            banco={banco}
            active={selectedBancos.includes(banco.id)}
            yearId={yearId}
            onToggle={() => onToggle(banco.id)}
            onDelete={() => setBancoToDelete(banco)}
          />
        ))}
      </div>

      <AlertDialog
        open={Boolean(bancoToDelete)}
        onClose={() => {
          if (!isDeleting) setBancoToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar banco de preguntas"
        description={
          bancoToDelete
            ? `¿Estás seguro de que querés eliminar el banco "${bancoToDelete.nombre}"? Esta acción es permanente y no se puede deshacer.`
            : ''
        }
        cancelText="Cancelar"
        confirmText={isDeleting ? 'Eliminando…' : 'Eliminar'}
        confirmDisabled={isDeleting}
        variant="destructive"
      />
    </section>
  )
}

function QuestionBankCard({
  banco,
  active,
  yearId,
  onToggle,
  onDelete,
}: {
  banco: BancoInfo
  active: boolean
  yearId?: string
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className={cn('group relative flex min-w-0 items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors', active ? CONTROL_ACTIVE : CONTROL)}>
      <button type="button" onClick={onToggle} className="absolute inset-0 size-full cursor-pointer text-left" aria-pressed={active}>
        <span className="sr-only">Seleccionar {banco.nombre}</span>
      </button>

      <div className="relative min-w-0 pointer-events-none z-10">
        <span className="block truncate text-sm font-semibold text-white">{banco.nombre}</span>
        <span className="mt-0.5 block text-xs text-white/44">{banco.totalPreguntas} preguntas</span>
        {banco.subidoPorNombre ? (
          <UploaderByline nombre={banco.subidoPorNombre} className="mt-1.5" />
        ) : null}
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <AdminControls yearId={yearId} ownerUserId={banco.subidoPorId} noWrapper>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="flex size-7 items-center justify-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            title="Eliminar banco de preguntas"
            aria-label={`Eliminar banco de preguntas ${banco.nombre}`}
          >
            <Trash2 className="size-4 text-rose-400" />
          </button>
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
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
    <div className={cn('group relative flex min-w-0 items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors', active ? CONTROL_ACTIVE : CONTROL)}>
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
      {state.mode !== 'ranked' ? <QuestionCountField count={state.count} maxPreguntas={maxPreguntas} onChange={actions.setCount} /> : <RankedNameField />}
      {state.mode === 'examen' ? <TimeLimitField timeLimit={state.timeLimit} onChange={actions.setTimeLimit} /> : null}
    </section>
  )
}

function ModeSelector() {
  const { actions, state } = useQuiz()

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-white">Modo</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {([
          ['practica', 'Práctica', null],
          ['examen', 'Examen', null],
          ['ranked', 'Ranked', 'beta'],
        ] as const).map(([value, label, badge]) => (
          <button key={value} type="button" onClick={() => actions.setMode(value)} className={cn('px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer', state.mode === value ? `${CONTROL_ACTIVE} text-white` : `${CONTROL} text-white/60`)}>
            <span className="inline-flex items-center justify-center gap-1.5">
              {label}
              {badge ? <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">{badge}</span> : null}
            </span>
          </button>
        ))}
      </div>
      {state.mode !== 'ranked' ? <p className="text-xs leading-5 text-white/40">{getModeDescription(state.mode)}</p> : null}
    </div>
  )
}

function RankedNameField() {
  const { actions, state } = useQuiz()

  if (state.rankedNameLocked && state.rankedName) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-bold text-white">Vas a participar como</p>
        <p className="text-sm font-semibold text-white/72">{state.rankedName}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label htmlFor="rankedName" className="block text-sm font-bold text-white">Nombre para el ranking</label>
      <input
        id="rankedName"
        type="text"
        value={state.rankedName}
        maxLength={32}
        placeholder="Tu nombre"
        onChange={(event) => actions.setRankedName(event.target.value)}
        className="block w-full border border-white/[0.06] bg-surface-3 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/45 focus:outline-none"
      />
    </div>
  )
}

function RankedInfoSection() {
  const { rankedQuestionCount, rankedSelectedBank, state } = useQuiz()
  const eligible = rankedSelectedBank ? isRankedBankEligible(rankedSelectedBank.totalPreguntas) : false

  return (
    <section className="space-y-5 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-sm font-bold text-white">Examen Ranked <span className="ml-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">beta</span></h2>
          <p className="mt-1 text-sm leading-6 text-white/48">Es un examen clasificado: se corrige al final y solo los mejores resultados aparecen en el top.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/36">Preguntas</p>
          <p className="mt-1 text-2xl font-black text-white tabular-nums">{rankedSelectedBank ? rankedQuestionCount : '—'}</p>
        </div>
      </div>
      {rankedSelectedBank && !eligible ? <p className="border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">Este banco todavía no llega al mínimo para ranked.</p> : null}
      {rankedSelectedBank ? (
        <>
          <RankedTop items={state.rankedTop} loading={state.rankedTopLoading} />
          <RankedHistoryLink />
        </>
      ) : null}
    </section>
  )
}

function RankedTop({ items, loading }: { items: RankedTopItem[]; loading: boolean }) {
  return (
    <div className="border-t border-white/[0.06] pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/36">Top del banco</h3>
        {loading ? <span className="text-xs text-white/36">Cargando…</span> : null}
      </div>
      {items.length === 0 && !loading ? <p className="text-sm text-white/44">Todavía no hay intentos válidos en el top.</p> : null}
      {items.length > 0 ? (
        <ol className="divide-y divide-white/[0.06]">
          {items.map((item) => (
            <li key={`${item.position}-${item.participantName}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-2.5 text-sm">
              <span className="font-black text-white/40 tabular-nums">{item.position}</span>
              <span className="min-w-0 truncate font-semibold text-white/82">{item.participantName}</span>
              <span className="text-right text-white/48 tabular-nums">{item.percentage}% · {formatQuizTime(item.durationSeconds)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

function getModeDescription(mode: 'practica' | 'examen' | 'ranked') {
  if (mode === 'practica') return 'Corregís cada pregunta al instante y ves la explicación.'
  if (mode === 'examen') return 'Respondés todo y ves el resultado al final.'
  return ''
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
        {state.loading ? 'Cargando…' : state.mode === 'ranked' ? 'Comenzar ranked' : 'Comenzar quiz'}
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
