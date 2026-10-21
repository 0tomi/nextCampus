'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { AdminControls } from '@/components/admin/AdminControls'
import { QuizBankModal } from '@/components/admin/QuizBankModal'
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
        <QuizIntro subjectNombre={subjectNombre} subjectSlug={subjectSlug} yearId={yearId} />
        <QuizEmptyState />
      </>
    )
  }

  return (
    <QuizProvider bancos={bancos} subjectSlug={subjectSlug} yearId={yearId}>
      <QuizHeader subjectNombre={subjectNombre} subjectSlug={subjectSlug} yearId={yearId} />
      <QuizPhaseSwitch />
      <RankedHistoryModal />
    </QuizProvider>
  )
}

// Durante el examen el encabezado se limpia: solo queda el nombre del banco
// como título, sin contexto adicional que distraiga.
function QuizHeader({ subjectNombre, subjectSlug, yearId }: QuizIntroProps) {
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

  return <QuizIntro subjectNombre={subjectNombre} subjectSlug={subjectSlug} yearId={yearId} />
}

interface QuizIntroProps {
  subjectNombre: string
  subjectSlug: string
  yearId?: string
}

function QuizIntro({ subjectNombre, subjectSlug, yearId }: QuizIntroProps) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const router = useRouter()
  const closeUpload = useCallback(() => setUploadOpen(false), [])
  const refreshBanks = useCallback(() => router.refresh(), [router])

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
      <AdminControls yearId={yearId} noWrapper>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 motion-safe:active:scale-[0.97]"
        >
          <Upload className="size-4" aria-hidden="true" />
          Subir banco de preguntas
        </button>
        <QuizBankModal
          open={uploadOpen}
          onClose={closeUpload}
          subjectSlug={subjectSlug}
          onUploaded={refreshBanks}
        />
      </AdminControls>
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
