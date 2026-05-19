'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  RotateCcw,
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

// Control hundido: más oscuro que la DarkCard (surface-1) que lo contiene.
// El layering nace de ese salto de lightness, no de bordes fuertes.
const CONTROL =
  'border border-white/[0.06] bg-surface-3 transition-colors hover:border-white/12'
const CONTROL_ACTIVE = 'border border-primary/45 bg-primary/12'

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

  // Atajos: 1-9 elige opción, V/F verdadero/falso, ←/→ navegan, Enter avanza.
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
      <DarkCard className="px-6 py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center border border-white/[0.06] bg-surface-3">
          <Layers className="h-5 w-5 text-white/28" />
        </span>
        <p className="mt-5 text-lg font-black tracking-tight text-white">
          Todavía no hay preguntas para practicar
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/48">
          Cuando el equipo de la materia cargue un banco de preguntas, vas a
          poder practicar acá.
        </p>
      </DarkCard>
    )
  }

  // ---------- Configuración ----------
  if (phase === 'config') {
    return (
      <DarkCard className="divide-y divide-white/[0.06]">
        <section className="space-y-4 p-6 sm:p-8">
          <div>
            <h2 className="text-sm font-bold text-white">
              Bancos de preguntas
            </h2>
            <p className="mt-1 text-sm text-white/48">
              Elegí uno o combiná varios para mezclar sus preguntas.
            </p>
          </div>
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
                    'flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer',
                    active ? CONTROL_ACTIVE : CONTROL,
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {b.nombre}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/44">
                      {b.totalPreguntas} preguntas
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center transition-colors',
                      active
                        ? 'bg-primary text-white'
                        : 'border border-white/15',
                    )}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Modo</h2>
            <div className="grid grid-cols-2 gap-2">
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
                    'px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer',
                    mode === value
                      ? CONTROL_ACTIVE + ' text-white'
                      : CONTROL + ' text-white/60',
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
              className="block text-sm font-bold text-white"
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
              className="block w-full border border-white/[0.06] bg-surface-3 px-3 py-2.5 text-sm text-white tabular-nums focus:border-primary/45 focus:outline-none"
            />
            <p className="text-xs leading-5 text-white/40">
              0 = todas{maxPreguntas > 0 ? ` · hasta ${maxPreguntas}` : ''}.
            </p>
          </div>
        </section>

        <section className="space-y-4 p-6 sm:p-8">
          {error && (
            <p className="border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={loading || selectedBancos.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-uader-red-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {loading ? 'Cargando…' : 'Comenzar quiz'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
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
      <div className="space-y-4">
        <DarkCard className="flex flex-col items-center px-6 py-12 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/36">
            Resultado
          </p>
          <p className="mt-4 font-display text-7xl font-black tracking-tight text-white tabular-nums">
            {pct}
            <span className="text-3xl text-white/40">%</span>
          </p>
          <p className="mt-3 text-sm text-white/52">
            {correctas} de {total} respuestas correctas
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-7 inline-flex items-center gap-2 border border-white/[0.06] bg-surface-3 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/12 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Volver a empezar
          </button>
        </DarkCard>

        <div className="space-y-3">
          {preguntas.map((p, i) => {
            const r = resultados[p.id]
            const ok = r?.correcta
            return (
              <DarkCard key={p.id} className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-xs font-black tabular-nums',
                      ok
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-rose-500/15 text-rose-300',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-relaxed text-white">
                      {p.question}
                    </p>
                    <AnswerSummary question={p} resultado={r} />
                    {r?.explicacion && (
                      <p className="mt-3 border-l border-white/12 pl-3 text-sm leading-6 text-white/52">
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
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white/56 tabular-nums">
            Pregunta {index + 1}
            <span className="text-white/32"> / {preguntas.length}</span>
          </span>
          <span className="font-semibold uppercase tracking-[0.18em] text-white/32">
            {isPractica ? 'Práctica' : 'Examen'}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden bg-white/[0.06]">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      <DarkCard className="p-6 sm:p-8">
        <h2 className="text-xl font-black leading-snug tracking-tight text-white sm:text-2xl">
          {pregunta.question}
        </h2>

        <div className="mt-6 space-y-2.5">
          {pregunta.type === 'truefalse'
            ? [
                { value: true, label: 'Verdadero' },
                { value: false, label: 'Falso' },
              ].map((opt) => (
                <OptionButton
                  key={String(opt.value)}
                  label={opt.label}
                  selected={answers[pregunta.id] === opt.value}
                  state={optionState(resultado, opt.value)}
                  disabled={Boolean(resultado)}
                  onClick={() => setAnswer(opt.value)}
                />
              ))
            : pregunta.options?.map((op, i) => {
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
                    state={optionState(resultado, i)}
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
        </div>

        {pregunta.type === 'multiple' && !resultado && (
          <p className="mt-3 text-xs text-white/36">
            Puede haber más de una respuesta correcta.
          </p>
        )}

        {isPractica && resultado && (
          <div
            className={cn(
              'mt-6 border-l-2 px-4 py-3 text-sm',
              resultado.correcta
                ? 'border-emerald-400 bg-emerald-500/10'
                : 'border-rose-400 bg-rose-500/10',
            )}
          >
            <p className="font-bold text-white">
              {resultado.correcta ? 'Correcto' : 'Incorrecto'}
            </p>
            {resultado.explicacion && (
              <p className="mt-1 leading-6 text-white/60">
                {resultado.explicacion}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-6 border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/52 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-25 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {isPractica && !resultado ? (
            <button
              type="button"
              onClick={verificar}
              disabled={loading || !respondida}
              className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-uader-red-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {loading ? 'Verificando…' : 'Verificar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={loading || !canAdvance}
              className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-uader-red-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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

// El color solo aparece tras corregir. Antes, todo es neutro (idle).
function optionState(
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
        'flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors cursor-pointer disabled:cursor-not-allowed',
        // borde siempre presente => sin salto de layout entre estados
        state === 'idle' && (selected ? CONTROL_ACTIVE : CONTROL),
        state === 'correct' && 'border border-emerald-400/50 bg-emerald-500/10',
        state === 'wrong' &&
          (selected
            ? 'border border-rose-400/50 bg-rose-500/10'
            : 'border border-white/[0.06] bg-surface-3 opacity-55'),
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold tabular-nums transition-colors',
          state === 'correct'
            ? 'bg-emerald-500/20 text-emerald-300'
            : state === 'wrong' && selected
              ? 'bg-rose-500/20 text-rose-300'
              : selected
                ? 'bg-primary text-white'
                : 'bg-white/[0.06] text-white/44',
        )}
      >
        {typeof index === 'number' ? index + 1 : selected ? '•' : ''}
      </span>
      <span className="min-w-0 flex-1 leading-relaxed text-white/82">
        {label}
      </span>
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
    <p className="mt-2 text-sm text-white/48">
      Respuesta correcta:{' '}
      <span className="font-semibold text-white/82">{texto}</span>
    </p>
  )
}
