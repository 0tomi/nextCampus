'use client'

import { RotateCcw } from 'lucide-react'
import { DarkCard } from '@/components/ui/DarkCard'
import { cn } from '@/lib/utils'
import { AnswerSummary } from './AnswerSummary'
import { UnitBreakdown } from './UnitBreakdown'
import { useQuiz } from './QuizProvider'

export function QuizResultsPhase() {
  const { state } = useQuiz()
  const resultados = Object.values(state.resultados)
  const total = state.preguntas.length
  const correctas = resultados.filter((resultado) => resultado.correcta).length
  const pct = total > 0 ? Math.round((correctas / total) * 100) : 0

  return (
    <div className="space-y-4">
      <ResultsSummaryCard correctas={correctas} pct={pct} total={total} />
      <UnitBreakdown resultados={resultados} />
      <QuestionReviewList />
    </div>
  )
}

function ResultsSummaryCard({ correctas, pct, total }: { correctas: number; pct: number; total: number }) {
  const { actions, state } = useQuiz()

  return (
    <DarkCard className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/36">Resultado</p>
      <p className="mt-4 font-display text-7xl font-black tracking-tight text-white tabular-nums">
        {pct}<span className="text-3xl text-white/40">%</span>
      </p>
      <p className="mt-3 text-sm text-white/52">{correctas} de {total} respuestas correctas</p>
      {state.mode === 'ranked' && state.rankedSummary ? (
        <p className={cn('mt-4 max-w-md text-sm leading-6', state.rankedSummary.validForRanking ? 'text-cyan-100' : 'text-amber-100')}>
          {state.rankedSummary.validForRanking ? 'Tu intento participa en el top del banco.' : 'Este intento queda fuera del top, pero tu resultado queda completo.'}
        </p>
      ) : null}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={actions.reset} className="inline-flex items-center gap-2 border border-white/[0.06] bg-surface-3 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/12 cursor-pointer">
          <RotateCcw className="size-4" />
          Volver a empezar
        </button>
        <button type="button" onClick={actions.reset} className="inline-flex items-center gap-2 border border-white/[0.06] bg-surface-3 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/12 cursor-pointer">
          Volver a los quizzes
        </button>
      </div>
    </DarkCard>
  )
}

function QuestionReviewList() {
  const { state } = useQuiz()

  return (
    <div className="space-y-3">
      {state.preguntas.map((question, index) => {
        const resultado = state.resultados[question.id]
        const ok = resultado?.correcta

        return (
          <DarkCard key={question.id} className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center text-xs font-black tabular-nums', ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300')}>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-relaxed text-white">{question.question}</p>
                <AnswerSummary question={question} resultado={resultado} />
                {resultado?.explicacion ? <p className="mt-3 border-l border-white/12 pl-3 text-sm leading-6 text-white/52">{resultado.explicacion}</p> : null}
              </div>
            </div>
          </DarkCard>
        )
      })}
    </div>
  )
}
