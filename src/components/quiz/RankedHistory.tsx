'use client'

import { useState } from 'react'
import { History, RotateCcw } from 'lucide-react'
import { DarkCard } from '@/components/ui/DarkCard'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { formatQuizTime } from './quizFormat'
import { useQuiz } from './QuizProvider'
import { fetchRankedHistory } from './rankedHistoryClient'
import type { RankedHistory, RankedHistorySummaryView } from './quizTypes'

const LOOKUP_HINT = 'El progreso se busca con el nombre que usás en Ranked.'

const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

function formatHistoryDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

function formatPosition(position: number | null): string | null {
  return position ? `${position}.º` : null
}

function formatChange(change: number | null): string | null {
  if (change === null) return null
  if (change === 0) return 'Sin cambios'
  const abs = Math.abs(change)
  const unidad = abs === 1 ? 'punto' : 'puntos'
  return change > 0 ? `${abs} ${unidad} más` : `${abs} ${unidad} menos`
}

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40'

// Tarjeta de comparación bajo el resultado ranked. Aparece una sola vez por
// examen, así que una entrada suave está bien.
export function RankedProgressCard() {
  const { actions, state } = useQuiz()
  const { rankedHistory, rankedHistoryLoading, rankedHistoryError } = state

  if (rankedHistoryError && !rankedHistory) {
    return (
      <DarkCard className="space-y-4 p-6 sm:p-7">
        <p className={EYEBROW}>Tu progreso con este nombre</p>
        <p className="text-sm text-white/52">No pudimos cargar tu progreso. Probá de nuevo en un momento.</p>
        <button
          type="button"
          onClick={() => actions.loadHistory(state.rankedHistoryName || state.rankedName)}
          className="inline-flex items-center gap-2 border border-white/[0.06] bg-surface-3 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/12 cursor-pointer"
        >
          <RotateCcw className="size-4" />
          Reintentar
        </button>
      </DarkCard>
    )
  }

  if (rankedHistoryLoading && !rankedHistory) {
    return <RankedProgressSkeleton />
  }

  if (!rankedHistory) return null

  const { summary } = rankedHistory

  if (summary.totalAttempts === 0) {
    return (
      <DarkCard className="space-y-2 p-6 sm:p-7">
        <p className={EYEBROW}>Tu progreso con este nombre</p>
        <p className="text-sm leading-6 text-white/52">{summary.message}</p>
      </DarkCard>
    )
  }

  const change = formatChange(summary.changeVsPrevious)
  const position = formatPosition(summary.position)

  return (
    <DarkCard className="space-y-5 p-6 sm:p-7">
      <div>
        <p className={EYEBROW}>Tu progreso con este nombre</p>
        <p className="mt-2 text-sm leading-6 text-white/64">{summary.message}</p>
      </div>

      <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
        <SummaryRow label="Mejor marca" value={`${summary.bestPercentage}%`} />
        <SummaryRow
          label="Último intento"
          value={`${summary.latestPercentage}% · ${formatQuizTime(summary.latestDurationSeconds)}`}
        />
        {change ? <SummaryRow label="Cambio" value={change} muted={summary.changeVsPrevious === 0} /> : null}
        {position ? <SummaryRow label="Posición actual" value={position} /> : null}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={actions.openHistory}
          className="inline-flex items-center gap-2 border border-white/[0.06] bg-surface-3 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/12 cursor-pointer"
        >
          <History className="size-4" />
          Ver mis intentos
        </button>
        <p className="text-xs leading-5 text-white/40">{LOOKUP_HINT}</p>
      </div>
    </DarkCard>
  )
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</span>
      <span className={cn('text-sm font-bold tabular-nums', muted ? 'text-white/52' : 'text-white')}>{value}</span>
    </div>
  )
}

function RankedProgressSkeleton() {
  return (
    <DarkCard className="space-y-5 p-6 sm:p-7">
      <div className="space-y-2">
        <div className="h-3 w-44 animate-pulse bg-white/[0.06]" />
        <div className="h-4 w-full max-w-xs animate-pulse bg-white/[0.06]" />
      </div>
      <div className="space-y-2 border-y border-white/[0.06] py-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-5 w-full animate-pulse bg-white/[0.06]" />
        ))}
      </div>
      <div className="h-9 w-40 animate-pulse bg-white/[0.06]" />
    </DarkCard>
  )
}

// Enlace secundario para consultar el progreso sin rendir otro examen.
export function RankedHistoryLink() {
  const { actions, state } = useQuiz()
  if (!state.rankedName) return null

  return (
    <button
      type="button"
      onClick={actions.openHistory}
      className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition-colors hover:text-cyan-100 cursor-pointer"
    >
      <History className="size-4" />
      Ver mi progreso
    </button>
  )
}

// Historial expandido. Vive en un modal y se monta una vez a nivel del runner.
export function RankedHistoryModal() {
  const { actions, state } = useQuiz()

  return (
    <Modal open={state.showHistory} onClose={actions.closeHistory} title="Mis intentos" titleId="ranked-history-title">
      <RankedHistoryContent />
    </Modal>
  )
}

// El modal se desmonta al cerrar, así que su estado de "otro nombre" vive
// local: consultar a otra persona no toca el progreso propio (ni la tarjeta del
// resultado) y se resetea solo al volver a abrir.
function RankedHistoryContent() {
  const { state, subjectSlug } = useQuiz()
  const bankId = state.selectedBancos[0]
  const [lookup, setLookup] = useState<RankedHistory | null>(null)
  const [lookupActive, setLookupActive] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState(false)

  const history = lookupActive ? lookup : state.rankedHistory
  const loading = lookupActive ? lookupLoading : state.rankedHistoryLoading
  const error = lookupActive ? lookupError : state.rankedHistoryError

  function lookupByName(name: string) {
    const target = name.trim()
    if (!bankId || !target) return
    setLookupActive(true)
    setLookupLoading(true)
    setLookupError(false)
    void (async () => {
      try {
        setLookup(await fetchRankedHistory(subjectSlug, bankId, target))
      } catch {
        setLookup(null)
        setLookupError(true)
      } finally {
        setLookupLoading(false)
      }
    })()
  }

  if (loading && !history) return <HistoryListSkeleton />

  if (error && !history) {
    return (
      <div className="space-y-5">
        <p className="py-6 text-center text-sm text-white/52">No pudimos cargar tu progreso. Probá de nuevo en un momento.</p>
        <ChangeNameForm onLookup={lookupByName} loading={lookupLoading} />
      </div>
    )
  }

  if (!history || history.summary.totalAttempts === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 border border-dashed border-white/10 px-6 py-10 text-center">
          <p className="text-sm text-white/56">{history?.summary.message ?? 'Todavía no hay resultados válidos con este nombre.'}</p>
        </div>
        <ChangeNameForm onLookup={lookupByName} loading={lookupLoading} />
      </div>
    )
  }

  const occurrenceByFingerprint = new Map<string, number>()
  const attemptsWithKeys = history.attempts.map((attempt) => {
    const fingerprint = [
      attempt.finishedAt,
      attempt.correctAnswers,
      attempt.totalQuestions,
      attempt.percentage,
      attempt.durationSeconds,
    ].join(':')
    const occurrence = (occurrenceByFingerprint.get(fingerprint) ?? 0) + 1
    occurrenceByFingerprint.set(fingerprint, occurrence)
    return { attempt, key: `${fingerprint}:${occurrence}` }
  })

  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold text-white/72">{history.participantName}</p>

      <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {attemptsWithKeys.map(({ attempt, key }) => (
          <li
            key={key}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <span className="text-sm text-white/56">{formatHistoryDate(attempt.finishedAt)}</span>
            <span className="text-right text-sm font-bold text-white tabular-nums sm:order-2">{attempt.percentage}%</span>
            <span className="text-right text-sm text-white/56 tabular-nums sm:order-3">
              {attempt.correctAnswers}/{attempt.totalQuestions}
            </span>
            <span className="text-right text-sm text-white/56 tabular-nums sm:order-4">{formatQuizTime(attempt.durationSeconds)}</span>
          </li>
        ))}
      </ol>

      <HistorySummaryFooter summary={history.summary} />
      <ChangeNameForm onLookup={lookupByName} loading={lookupLoading} />
      <p className="text-xs leading-5 text-white/40">{LOOKUP_HINT}</p>
    </div>
  )
}

function HistoryListSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-4 w-32 animate-pulse bg-white/[0.06]" />
      <div className="space-y-2 border-y border-white/[0.06] py-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-5 w-full animate-pulse bg-white/[0.06]" />
        ))}
      </div>
      <div className="h-4 w-40 animate-pulse bg-white/[0.06]" />
    </div>
  )
}

function HistorySummaryFooter({ summary }: { summary: RankedHistorySummaryView }) {
  return (
    <p className="text-sm text-white/64">
      Tu mejor resultado fue <span className="font-bold text-white tabular-nums">{summary.bestPercentage}%</span>.
    </p>
  )
}

function ChangeNameForm({ onLookup, loading }: { onLookup: (name: string) => void; loading: boolean }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-cyan-200 transition-colors hover:text-cyan-100 cursor-pointer"
      >
        Usar otro nombre
      </button>
    )
  }

  function submit() {
    const name = value.trim()
    if (!name) return
    onLookup(name)
    setOpen(false)
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        aria-label="Otro nombre para consultar el progreso"
        value={value}
        maxLength={32}
        placeholder="Otro nombre"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
        className="block w-full border border-white/[0.06] bg-surface-3 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary/45 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={loading || value.trim().length === 0}
        className="shrink-0 bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        Ver progreso
      </button>
    </div>
  )
}
