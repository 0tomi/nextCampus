'use client'

import { QuizRunnerClient } from '@/components/quiz/QuizRunnerClient'
import type { BancoInfo } from '@/components/quiz/quizTypes'

interface QuizRunnerProps {
  subjectSlug: string
  bancos: BancoInfo[]
  yearId?: string
}

export function QuizRunner({ subjectSlug, bancos, yearId }: QuizRunnerProps) {
  return <QuizRunnerClient subjectSlug={subjectSlug} bancos={bancos} yearId={yearId} />
}
