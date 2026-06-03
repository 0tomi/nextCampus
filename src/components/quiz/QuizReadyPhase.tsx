'use client'

import { ChevronRight, RotateCcw } from 'lucide-react'
import { DarkCard } from '@/components/ui/DarkCard'
import { useQuiz } from './QuizProvider'

export function QuizReadyPhase() {
  const { actions, state } = useQuiz()

  return (
    <DarkCard className="p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/36">Examen Ranked</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">Todo listo para empezar</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/52">Al comenzar, vas directo a la primera pregunta. Desde ahí, el intento queda activo para el top.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/36">Preguntas</p>
          <p className="mt-1 text-3xl font-black text-white tabular-nums">{state.preguntas.length}</p>
        </div>
      </div>

      {state.error ? <p className="mt-6 border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{state.error}</p> : null}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <button type="button" onClick={actions.reset} className="inline-flex items-center gap-2 border border-white/[0.06] bg-surface-3 px-4 py-2.5 text-sm font-semibold text-white/78 transition-colors hover:border-white/12 hover:text-white cursor-pointer">
          <RotateCcw className="size-4" />
          Volver
        </button>
        <button type="button" onClick={actions.enterRanked} disabled={state.loading} className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
          {state.loading ? 'Empezando…' : 'Empezar primera pregunta'}
          <ChevronRight className="size-4" />
        </button>
      </div>
    </DarkCard>
  )
}
