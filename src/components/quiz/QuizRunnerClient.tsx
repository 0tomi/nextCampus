'use client'

import { QuizConfigPhase } from './QuizConfigPhase'
import { QuizEmptyState } from './QuizEmptyState'
import { QuizProvider, useQuiz } from './QuizProvider'
import { QuizReadyPhase } from './QuizReadyPhase'
import { QuizResultsPhase } from './QuizResultsPhase'
import { QuizRunningPhase } from './QuizRunningPhase'
import type { BancoInfo } from './quizTypes'

export function QuizRunnerClient({
  bancos,
  subjectSlug,
  yearId,
}: {
  subjectSlug: string
  bancos: BancoInfo[]
  yearId?: string
}) {
  if (bancos.length === 0) return <QuizEmptyState />

  return (
    <QuizProvider bancos={bancos} subjectSlug={subjectSlug} yearId={yearId}>
      <QuizPhaseSwitch />
    </QuizProvider>
  )
}

function QuizPhaseSwitch() {
  const { state } = useQuiz()

  if (state.phase === 'config') return <QuizConfigPhase />
  if (state.phase === 'ready') return <QuizReadyPhase />
  if (state.phase === 'done') return <QuizResultsPhase />
  return <QuizRunningPhase />
}
