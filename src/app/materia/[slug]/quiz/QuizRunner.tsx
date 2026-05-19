'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { DarkCard } from '@/components/ui/DarkCard'
import { cn } from '@/lib/utils'

type Mode = 'practica' | 'examen'

interface BancoInfo {
  id: string
  nombre: string
  totalPreguntas: number
}

interface PublicQuestion {
  id: string
  type: 'single' | 'multiple' | 'truefalse'
  question: string
  options?: string[]
}

interface Resultado {
  id: string
  correcta: boolean
  respuestaCorrecta: number | number[] | boolean
  explicacion: string
}

type UserAnswer = number | number[] | boolean | null

interface QuizRunnerProps {
  subjectSlug: string
  bancos: BancoInfo[]
}

const PANEL =
  'border border-white/5 bg-surface-1 transition-colors hover:border-white/10'

export function QuizRunner({ subjectSlug, bancos }: QuizRunnerProps) {
  const [phase, setPhase] = useState<'config' | 'running' | 'done'>('config')
  const [mode, setMode] = useState<Mode>('practica')
  const [count, setCount] = useState(0)
  const [selectedBancos, setSelectedBancos] = useState<string[]>(
    bancos.length === 1 ? [bancos[0].id] : [],
  )
  const [preguntas, setPreguntas] = useState<PublicQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({})
  const [resultados, setResultados] = useState<Record<string, Resultado>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxPreguntas = useMemo(
    () =>
      bancos
        .filter((b) => selectedBancos.includes(b.id))
        .reduce((acc, b) => acc + b.totalPreguntas, 0),
    [bancos, selectedBancos],
  )

  const toggleBanco = useCallback((id: string) => {
    setSelectedBancos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  const start = useCallback(async () => {
    if (selectedBancos.length === 0) {
      setError('Elegí al menos un banco de preguntas.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        subject: subjectSlug,
        banks: selectedBancos.join(','),
        mode,
        count: String(count),
      })
      const res = await fetch(`/api/quiz/set?${qs.toString()}`)
      if (!res.ok) throw new Error('No se pudo cargar el quiz.')
      const data: { preguntas: PublicQuestion[] } = await res.json()
      if (data.preguntas.length === 0) {
        throw new Error('No hay preguntas para esa selección.')
      }
      setPreguntas(data.preguntas)
      setIndex(0)
      setAnswers({})
      setResultados({})
      setPhase('running')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.')
    } finally {
      setLoading(false)
    }
  }, [subjectSlug, mode, count, selectedBancos])

  const reset = useCallback(() => {
    setPhase('config')
    setPreguntas([])
    setAnswers({})
    setResultados({})
    setIndex(0)
    setError(null)
  }, [])

  const pregunta = preguntas[index]
  const resultado = pregunta ? resultados[pregunta.id] : undefined
  const isPractica = mode === 'practica'

  const setAnswer = useCallback(
    (value: UserAnswer) => {
      if (!pregunta || resultados[pregunta.id]) return
      setAnswers((prev) => ({ ...prev, [pregunta.id]: value }))
    },
    [pregunta, resultados],
  )

  const verificar = useCallback(async () => {
    if (!pregunta) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectSlug,
          answers: [
            { id: pregunta.id, answer: answers[pregunta.id] ?? null },
          ],
        }),
      })
      if (!res.ok) throw new Error('No se pudo corregir.')
      const data: { resultados: Resultado[] } = await res.json()
      const r = data.resultados[0]
      setResultados((prev) => ({ ...prev, [r.id]: r }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.')
    } finally {
      setLoading(false)
    }
  }, [pregunta, answers, subjectSlug])

  const finalizar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectSlug,
          answers: preguntas.map((p) => ({
            id: p.id,
            answer: answers[p.id] ?? null,
          })),
        }),
      })
      if (!res.ok) throw new Error('No se pudo corregir el quiz.')
      const data: { resultados: Resultado[] } = await res.json()
      setResultados(
        Object.fromEntries(data.resultados.map((r) => [r.id, r])),
      )
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.')
    } finally {
      setLoading(false)
    }
  }, [preguntas, answers, subjectSlug])

  const isLast = index === preguntas.length - 1
  const canAdvance = isPractica ? Boolean(resultado) : true

  const next = useCallback(() => {
    if (isLast) {
      void finalizar()
    } else {
      setIndex((i) => Math.min(i + 1, preguntas.length - 1))
    }
  }, [isLast, finalizar, preguntas.length])

  // Atajos de teclado: 1-9 elige opción, V/F para verdadero/falso,
  // Enter avanza/verifica, flechas navegan.
  useEffect(() => {
    if (phase !== 'running' || !pregunta) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && index > 0) {
        setIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'ArrowRight' && canAdvance) {
        next()
        return
      }
      if (e.key === 'Enter') {
        if (isPractica && !resultado) void verificar()
        else if (canAdvance) next()
        return
      }
      if (resultado) return
      if (pregunta.type === 'truefalse') {
        if (e.key.toLowerCase() === 'v') setAnswer(true)
        if (e.key.toLowerCase() === 'f') setAnswer(false)
        return
      }
      const n = Number(e.key)
      if (
        Number.isInteger(n) &&
        n >= 1 &&
        pregunta.options &&
        n <= pregunta.options.length
      ) {
        const optionIdx = n - 1
        if (pregunta.type === 'single') {
          setAnswer(optionIdx)
        } else {
          const current = Array.isArray(answers[pregunta.id])
            ? (answers[pregunta.id] as number[])
            : []
          setAnswer(
            current.includes(optionIdx)
              ? current.filter((x) => x !== optionIdx)
              : [...current, optionIdx],
          )
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    phase,
    pregunta,
    index,
    canAdvance,
    isPractica,
    resultado,
    answers,
    next,
    verificar,
    setAnswer,
  ])

  // ---------- Sin bancos ----------
  if (bancos.length === 0) {
    return (
      <DarkCard className="p-8 text-center">
        <Layers className="mx-auto h-10 w-10 text-white/24" />
        <p className="mt-4 text-lg font-black text-white">
          Todavía no hay preguntas para practicar
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/52">
          Cuando el equipo de la materia cargue un banco de preguntas, vas a
          poder practicar acá.
        </p>
      </DarkCard>
    )
  }

  // ---------- Configuración ----------
  if (phase === 'config') {
    return (
      <DarkCard className="space-y-8 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Bancos de preguntas
          </p>
          <p className="text-sm text-white/52">
            Elegí uno o combiná varios para mezclar sus preguntas.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {bancos.map((b) => {
              const active = selectedBancos.includes(b.id)
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBanco(b.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
                    active
                      ? 'border border-primary/60 bg-primary/10'
                      : PANEL,
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {b.nombre}
                    </span>
                    <span className="text-xs text-white/48">
                      {b.totalPreguntas} preguntas
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center border',
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-white/20 text-transparent',
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
              Modo
            </p>
            <div className="flex gap-2">
              {(
                [
                  ['practica', 'Práctica'],
                  ['examen', 'Examen'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    'flex-1 px-4 py-2.5 text-sm font-semibold transition-colors',
                    mode === value
                      ? 'border border-primary/60 bg-primary/10 text-white'
                      : `${PANEL} text-white/64`,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-5 text-white/40">
              {mode === 'practica'
                ? 'Corregís cada pregunta al instante y ves la explicación.'
                : 'Respondés todo y ves el resultado al final.'}
            </p>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="count"
              className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38"
            >
              Cantidad de preguntas
            </label>
            <input
              id="count"
              type="number"
              min={0}
              max={maxPreguntas || undefined}
              value={count}
              onChange={(e) =>
                setCount(Math.max(0, Number(e.target.value) || 0))
              }
              className="block w-full border border-white/5 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder:text-white/28 focus:border-white/10 focus:outline-none"
            />
            <p className="text-xs leading-5 text-white/40">
              0 = todas{maxPreguntas > 0 ? ` (hasta ${maxPreguntas})` : ''}.
            </p>
          </div>
        </div>

        {error && (
          <p className="border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={start}
          disabled={loading || selectedBancos.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-uader-red-light disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {loading ? 'Cargando…' : 'Comenzar quiz'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </DarkCard>
    )
  }

  // ---------- Resultado ----------
  if (phase === 'done') {
    const total = preguntas.length
    const correctas = Object.values(resultados).filter(
      (r) => r.correcta,
    ).length
    const pct = total > 0 ? Math.round((correctas / total) * 100) : 0
    return (
      <div className="space-y-6">
        <DarkCard className="p-6 text-center sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Resultado
          </p>
          <p className="mt-4 text-6xl font-black tracking-tight text-white">
            {pct}%
          </p>
          <p className="mt-2 text-sm text-white/58">
            {correctas} de {total} respuestas correctas
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
            Volver a empezar
          </button>
        </DarkCard>

        <div className="space-y-3">
          {preguntas.map((p, i) => {
            const r = resultados[p.id]
            return (
              <DarkCard key={p.id} className="p-5">
                <div className="flex items-start gap-3">
                  {r?.correcta ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">
                      Pregunta {i + 1}
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {p.question}
                    </p>
                    <AnswerSummary question={p} resultado={r} />
                    {r?.explicacion && (
                      <p className="mt-3 border-l-2 border-white/10 pl-3 text-sm leading-6 text-white/58">
                        {r.explicacion}
                      </p>
                    )}
                  </div>
                </div>
              </DarkCard>
            )
          })}
        </div>
      </div>
    )
  }

  // ---------- Pregunta ----------
  if (!pregunta) return null
  const progreso = ((index + 1) / preguntas.length) * 100
  const respondida =
    answers[pregunta.id] !== undefined && answers[pregunta.id] !== null

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm text-white/52">
          <span>
            Pregunta{' '}
            <strong className="text-white">{index + 1}</strong> de{' '}
            {preguntas.length}
          </span>
          <span className="uppercase tracking-[0.18em] text-white/38">
            {isPractica ? 'Práctica' : 'Examen'}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden bg-white/5">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      <DarkCard className="space-y-6 p-6 sm:p-8">
        <h2 className="text-xl font-black leading-snug tracking-tight text-white sm:text-2xl">
          {pregunta.question}
        </h2>

        {pregunta.type === 'truefalse' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: true, label: 'Verdadero' },
              { value: false, label: 'Falso' },
            ].map((opt) => (
              <OptionButton
                key={String(opt.value)}
                label={opt.label}
                selected={answers[pregunta.id] === opt.value}
                state={optionState(pregunta, resultado, opt.value)}
                disabled={Boolean(resultado)}
                onClick={() => setAnswer(opt.value)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {pregunta.options?.map((op, i) => {
              const isMulti = pregunta.type === 'multiple'
              const selectedArr = Array.isArray(answers[pregunta.id])
                ? (answers[pregunta.id] as number[])
                : []
              const selected = isMulti
                ? selectedArr.includes(i)
                : answers[pregunta.id] === i
              return (
                <OptionButton
                  key={i}
                  index={i}
                  label={op}
                  selected={selected}
                  state={optionState(pregunta, resultado, i)}
                  disabled={Boolean(resultado)}
                  onClick={() => {
                    if (isMulti) {
                      setAnswer(
                        selectedArr.includes(i)
                          ? selectedArr.filter((x) => x !== i)
                          : [...selectedArr, i],
                      )
                    } else {
                      setAnswer(i)
                    }
                  }}
                />
              )
            })}
            {pregunta.type === 'multiple' && (
              <p className="text-xs text-white/38">
                Puede haber más de una respuesta correcta.
              </p>
            )}
          </div>
        )}

        {isPractica && resultado && (
          <div
            className={cn(
              'border-l-2 px-4 py-3 text-sm',
              resultado.correcta
                ? 'border-emerald-400 bg-emerald-500/10'
                : 'border-rose-400 bg-rose-500/10',
            )}
          >
            <p className="font-bold text-white">
              {resultado.correcta ? 'Correcto' : 'Incorrecto'}
            </p>
            {resultado.explicacion && (
              <p className="mt-1 leading-6 text-white/64">
                {resultado.explicacion}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white/58 transition-colors hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {isPractica && !resultado ? (
            <button
              type="button"
              onClick={verificar}
              disabled={loading || !respondida}
              className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-uader-red-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Verificando…' : 'Verificar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={loading || !canAdvance}
              className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-uader-red-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? 'Corrigiendo…'
                : isLast
                  ? 'Finalizar'
                  : 'Siguiente'}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </DarkCard>
    </div>
  )
}

// Estado visual de una opción: solo se colorea cuando ya hay corrección.
function optionState(
  pregunta: PublicQuestion,
  resultado: Resultado | undefined,
  value: number | boolean,
): 'idle' | 'correct' | 'wrong' {
  if (!resultado) return 'idle'
  const correcta = resultado.respuestaCorrecta
  const isCorrectOption = Array.isArray(correcta)
    ? typeof value === 'number' && correcta.includes(value)
    : correcta === value
  return isCorrectOption ? 'correct' : 'wrong'
}

interface OptionButtonProps {
  label: string
  index?: number
  selected: boolean
  state: 'idle' | 'correct' | 'wrong'
  disabled: boolean
  onClick: () => void
}

function OptionButton({
  label,
  index,
  selected,
  state,
  disabled,
  onClick,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors',
        state === 'correct' && 'border border-emerald-400/60 bg-emerald-500/10',
        state === 'wrong' &&
          selected &&
          'border border-rose-400/60 bg-rose-500/10',
        state === 'wrong' && !selected && PANEL,
        state === 'idle' && selected && 'border border-primary/60 bg-primary/10',
        state === 'idle' && !selected && PANEL,
        !disabled && state === 'idle' && 'cursor-pointer',
      )}
    >
      {typeof index === 'number' && (
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold',
            selected ? 'bg-primary text-white' : 'bg-white/5 text-white/52',
          )}
        >
          {index + 1}
        </span>
      )}
      <span className="min-w-0 flex-1 text-white/82">{label}</span>
    </button>
  )
}

function AnswerSummary({
  question,
  resultado,
}: {
  question: PublicQuestion
  resultado: Resultado | undefined
}) {
  if (!resultado) return null
  const correcta = resultado.respuestaCorrecta
  let texto: string
  if (typeof correcta === 'boolean') {
    texto = correcta ? 'Verdadero' : 'Falso'
  } else if (Array.isArray(correcta)) {
    texto = correcta
      .map((i) => question.options?.[i] ?? `Opción ${i + 1}`)
      .join(', ')
  } else {
    texto = question.options?.[correcta] ?? `Opción ${correcta + 1}`
  }
  return (
    <p className="mt-2 text-sm text-white/52">
      Respuesta correcta:{' '}
      <span className="font-semibold text-white/82">{texto}</span>
    </p>
  )
}
