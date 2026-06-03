'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { DarkCard } from '@/components/ui/DarkCard'
import { cn } from '@/lib/utils'
import { formatQuizTime } from './quizFormat'
import { OptionButton } from './OptionButton'
import { optionState } from './quizOptionState'
import { useQuiz } from './QuizProvider'

const TRUE_FALSE_OPTIONS = [
  { value: true, label: 'Verdadero' },
  { value: false, label: 'Falso' },
]

export function QuizRunningPhase() {
  const { pregunta } = useQuiz()
  if (!pregunta) return null

  return (
    <div className="space-y-5">
      <QuestionProgressHeader />
      <RankedInvalidationNotice />
      <QuestionCard />
      <QuizDialogs />
    </div>
  )
}

function QuestionProgressHeader() {
  const { actions, isPractica, isRanked, progreso, state } = useQuiz()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-white/56 tabular-nums">
          Pregunta {state.index + 1}<span className="text-white/32"> / {state.preguntas.length}</span>
        </span>
        <div className="flex items-center gap-3">
          {state.timeLeft !== null ? <TimerBadge timeLeft={state.timeLeft} /> : null}
          <span className="font-semibold uppercase tracking-[0.18em] text-white/32">{isPractica ? 'Práctica' : isRanked ? 'Ranked · beta' : 'Examen'}</span>
          <button type="button" onClick={actions.openExitDialog} className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer transition-colors">
            Salir
          </button>
        </div>
      </div>
      <div className="h-1 w-full overflow-hidden bg-white/[0.06]">
        <div className="h-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${progreso}%` }} />
      </div>
    </div>
  )
}

function TimerBadge({ timeLeft }: { timeLeft: number }) {
  return (
    <span className={cn('font-mono font-bold px-2 py-0.5 rounded-sm text-[11px] tabular-nums', timeLeft < 60 ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'bg-white/[0.06] text-white/80')}>
      {formatQuizTime(timeLeft)}
    </span>
  )
}

function RankedInvalidationNotice() {
  const { isRanked, state } = useQuiz()
  if (!isRanked || !state.rankedInvalidated) return null

  return (
    <div className="border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
      Este intento queda fuera del top, pero podés terminarlo y ver tu resultado.
    </div>
  )
}

function QuestionCard() {
  const { pregunta, resultado, state } = useQuiz()
  if (!pregunta) return null

  return (
    <DarkCard className="p-6 sm:p-8">
      <h2 className="text-xl font-black leading-snug tracking-tight text-white sm:text-2xl">{pregunta.question}</h2>
      <QuestionOptions />
      {pregunta.type === 'multiple' && !resultado ? <p className="mt-3 text-xs text-white/36">Puede haber más de una respuesta correcta.</p> : null}
      <PracticeFeedback />
      {state.error ? <p className="mt-6 border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{state.error}</p> : null}
      <QuestionNavigation />
    </DarkCard>
  )
}

function QuestionOptions() {
  const { actions, pregunta, resultado, state } = useQuiz()
  if (!pregunta) return null

  if (pregunta.type === 'truefalse') {
    return (
      <div className="mt-6 space-y-2.5">
        {TRUE_FALSE_OPTIONS.map((option) => (
          <OptionButton
            key={String(option.value)}
            label={option.label}
            selected={state.answers[pregunta.id] === option.value}
            state={optionState(resultado, option.value)}
            disabled={Boolean(resultado)}
            onClick={() => actions.setAnswer(option.value)}
          />
        ))}
      </div>
    )
  }

  const isMulti = pregunta.type === 'multiple'
  const selectedArr = Array.isArray(state.answers[pregunta.id]) ? (state.answers[pregunta.id] as number[]) : []

  return (
    <div className="mt-6 space-y-2.5">
      {pregunta.options?.map((option, index) => {
        const selected = isMulti ? selectedArr.includes(option.id) : state.answers[pregunta.id] === option.id
        return (
          <OptionButton
            key={option.id}
            index={index}
            label={option.label}
            selected={selected}
            state={optionState(resultado, option.id)}
            disabled={Boolean(resultado)}
            onClick={() => actions.setAnswer(isMulti ? toggleOption(selectedArr, option.id) : option.id)}
          />
        )
      })}
    </div>
  )
}

function PracticeFeedback() {
  const { isPractica, resultado } = useQuiz()

  if (!isPractica || !resultado) return null

  return (
    <div className={cn('mt-6 border-l-2 px-4 py-3 text-sm', resultado.correcta ? 'border-emerald-400 bg-emerald-500/10' : 'border-rose-400 bg-rose-500/10')}>
      <p className="font-bold text-white">{resultado.correcta ? 'Correcto' : 'Incorrecto'}</p>
      {resultado.explicacion ? <p className="mt-1 leading-6 text-white/60">{resultado.explicacion}</p> : null}
    </div>
  )
}

function QuestionNavigation() {
  const { actions, canAdvance, isLast, isPractica, respondida, resultado, state } = useQuiz()

  return (
    <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
      <button type="button" onClick={actions.previous} disabled={state.index === 0} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/52 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-25 cursor-pointer">
        <ChevronLeft className="size-4" />
        Anterior
      </button>

      <div className="flex items-center gap-3">
        {isPractica && !resultado ? (
          <PracticeActions isLast={isLast} loading={state.loading} respondida={respondida} onNext={actions.next} onVerify={actions.verify} />
        ) : (
          <AdvanceActions canAdvance={canAdvance} isLast={isLast} />
        )}
      </div>
    </div>
  )
}

function PracticeActions({
  isLast,
  loading,
  respondida,
  onNext,
  onVerify,
}: {
  isLast: boolean
  loading: boolean
  respondida: boolean
  onNext: () => void
  onVerify: () => void
}) {
  return (
    <>
      <button type="button" onClick={onNext} className="inline-flex items-center gap-2 border border-white/[0.06] bg-surface-3 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/12 cursor-pointer">
        {isLast ? 'Finalizar sin verificar' : 'Avanzar sin verificar'}
      </button>
      <button type="button" onClick={onVerify} disabled={loading || !respondida} className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
        {loading ? 'Verificando…' : 'Verificar'}
      </button>
    </>
  )
}

function AdvanceActions({ canAdvance, isLast }: { canAdvance: boolean; isLast: boolean }) {
  const { actions, isPractica, state } = useQuiz()

  return (
    <>
      {!isPractica && !isLast ? (
        <button type="button" onClick={actions.openSubmitDialog} className="inline-flex items-center gap-2 border border-white/8 bg-surface-3 px-5 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-300 cursor-pointer">
          Entregar examen
        </button>
      ) : null}
      <button type="button" onClick={actions.next} disabled={state.loading || !canAdvance} className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
        {state.loading ? 'Corrigiendo…' : isLast ? 'Finalizar' : 'Siguiente'}
        {!isLast ? <ChevronRight className="size-4" /> : null}
      </button>
    </>
  )
}

function QuizDialogs() {
  const { actions, state } = useQuiz()

  return (
    <>
      <AlertDialog
        open={state.showExitDialog}
        onClose={actions.closeExitDialog}
        onConfirm={actions.reset}
        title={state.mode === 'practica' ? '¿Salir del quiz?' : '¿Abandonar examen?'}
        description={state.mode === 'ranked' ? 'Si salís ahora, el intento queda fuera del top.' : state.mode === 'examen' ? '¿Estás seguro de que querés abandonar el examen? Perderás tu progreso actual.' : '¿Estás seguro de que querés salir y volver a la pantalla de configuración?'}
        cancelText="Cancelar"
        confirmText="Salir"
        variant="destructive"
      />
      <AlertDialog
        open={state.showSubmitDialog}
        onClose={actions.closeSubmitDialog}
        onConfirm={() => {
          actions.closeSubmitDialog()
          actions.finish()
        }}
        title="¿Entregar examen?"
        description="Se corregirán las preguntas que hayas respondido hasta el momento y finalizará el intento."
        cancelText="Cancelar"
        confirmText="Entregar"
      />
    </>
  )
}

function toggleOption(current: number[], optionIndex: number) {
  return current.includes(optionIndex) ? current.filter((item) => item !== optionIndex) : [...current, optionIndex]
}
