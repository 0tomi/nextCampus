'use client'

import { useEffect, useState } from 'react'
import { getRankedMaxDurationSeconds } from '@/lib/domain/ranked-quiz'
import { formatQuizTime } from './quizFormat'

import { elapsedSeconds, startRankedClock, type RankedTiming } from './rankedClock'

export function RankedTimer({ timing, totalQuestions }: { timing: RankedTiming; totalQuestions: number }) {
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(timing))

  useEffect(() => startRankedClock(timing, setElapsed), [timing])

  return (
    <span className="ml-auto rounded-sm bg-white/[0.06] px-2 py-0.5 text-right font-mono text-[11px] font-bold text-white/80 tabular-nums" aria-label="Tiempo transcurrido / máximo disponible">
      {formatQuizTime(elapsed)} / {formatQuizTime(getRankedMaxDurationSeconds(totalQuestions))}
    </span>
  )
}
