'use client'

import { QuizRunnerClient } from '@/components/quiz/QuizRunnerClient'
import type { BancoInfo } from '@/components/quiz/quizTypes'

interface QuizRunnerProps {
  subjectSlug: string
  subjectNombre: string
  bancos: BancoInfo[]
  yearId?: string
}

export function QuizRunner({ subjectSlug, subjectNombre, bancos, yearId }: QuizRunnerProps) {
  return (
    <QuizRunnerClient
      subjectSlug={subjectSlug}
      subjectNombre={subjectNombre}
      bancos={bancos}
      yearId={yearId}
    />
  )
}
