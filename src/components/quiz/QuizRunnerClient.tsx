'use client'

import { QuizConfigPhase } from './QuizConfigPhase'
import { QuizEmptyState } from './QuizEmptyState'
import { QuizProvider, useQuiz } from './QuizProvider'
import { QuizReadyPhase } from './QuizReadyPhase'
import { QuizResultsPhase } from './QuizResultsPhase'
import { QuizRunningPhase } from './QuizRunningPhase'
import { RankedHistoryModal } from './RankedHistory'
import type { BancoInfo } from './quizTypes'

export function QuizRunnerClient({
  bancos,
  subjectSlug,
  subjectNombre,
  yearId,
}: {
  subjectSlug: string
  subjectNombre: string
  bancos: BancoInfo[]
  yearId?: string
}) {
  if (bancos.length === 0) {
    return (
      <>
        <QuizIntro subjectNombre={subjectNombre} />
        <QuizEmptyState />
      </>
    )
  }

  return (
    <QuizProvider bancos={bancos} subjectSlug={subjectSlug} yearId={yearId}>
      <QuizHeader subjectNombre={subjectNombre} />
      <QuizPhaseSwitch />
      <RankedHistoryModal />
    </QuizProvider>
  )
}

// Durante el examen el encabezado se limpia: solo queda el nombre del banco
// como título, sin contexto adicional que distraiga.
function QuizHeader({ subjectNombre }: { subjectNombre: string }) {
  const { bancos, state } = useQuiz()

  if (state.phase === 'running') {
    const titulo =
      bancos
        .filter((banco) => state.selectedBancos.includes(banco.id))
        .map((banco) => banco.nombre)
        .join(' · ') || subjectNombre

    return (
      <div className="mb-10">
        <h1 className="break-words font-display text-4xl font-black tracking-tight text-white">
          {titulo}
        </h1>
      </div>
    )
  }

  return <QuizIntro subjectNombre={subjectNombre} />
}

function QuizIntro({ subjectNombre }: { subjectNombre: string }) {
  return (
    <div className="mb-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/36">
        Modo estudio
      </p>
      <h1 className="mt-3 break-words font-display text-4xl font-black tracking-tight text-white">
        Quiz · {subjectNombre}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-white/52">
        Elegí uno o varios bancos de preguntas, configurá tu práctica y poné a
        prueba lo que sabés.
      </p>
    </div>
  )
}

function QuizPhaseSwitch() {
  const { state } = useQuiz()

  if (state.phase === 'config') return <QuizConfigPhase />
  if (state.phase === 'ready') return <QuizReadyPhase />
  if (state.phase === 'done') return <QuizResultsPhase />
  return <QuizRunningPhase />
}
