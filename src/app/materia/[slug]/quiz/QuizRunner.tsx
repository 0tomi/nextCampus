'use client'

import { useCallback, useState } from 'react'
import { ConstructivistCard } from '@/components/shared/ConstructivistCard'

type Mode = 'practica' | 'examen-tiempo' | 'general'

interface UnidadInfo {
  id: string
  titulo: string
  preguntas: number
}

interface PreguntaPublica {
  id: string
  tipo: 'MULTIPLE_CHOICE' | 'VERDADERO_FALSO' | 'RESPUESTA_CORTA'
  enunciado: string
  opciones: string[]
}

interface Resultado {
  preguntaId: string
  correcta: boolean
  explicacion: string
  respuestaCorrecta: string
}

interface AnswerPayload {
  preguntaId: string
  userAnswer: string
}

interface QuizRunnerProps {
  subjectSlug: string
  unidades: UnidadInfo[]
}

export function QuizRunner({ subjectSlug, unidades }: QuizRunnerProps) {
  const [mode, setMode] = useState<Mode>('practica')
  const [count, setCount] = useState(0)
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([])
  const [preguntas, setPreguntas] = useState<PreguntaPublica[] | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<Record<string, Resultado>>({})
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        subject: subjectSlug,
        mode,
        count: String(count),
      })
      if (selectedUnidades.length > 0) {
        qs.set('unidades', selectedUnidades.join(','))
      }
      const res = await fetch(`/api/quiz/set?${qs.toString()}`)
      if (!res.ok) throw new Error('No se pudo cargar el quiz')
      const data: { preguntas: PreguntaPublica[] } = await res.json()
      setPreguntas(data.preguntas)
      setIndex(0)
      setAnswers({})
      setResultados({})
      setFinished(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [subjectSlug, mode, count, selectedUnidades])

  const grade = useCallback(async (preguntaId: string, userAnswer: string) => {
    const res = await fetch('/api/quiz/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preguntaId, userAnswer }),
    })
    if (!res.ok) return
    const data: Resultado = await res.json()
    setResultados((prev) => ({ ...prev, [preguntaId]: data }))
  }, [])

  const gradeBatch = useCallback(async (payloads: AnswerPayload[]) => {
    const res = await fetch('/api/quiz/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: payloads }),
    })
    if (!res.ok) throw new Error('No se pudo corregir el quiz')
    const data: { resultados: Resultado[] } = await res.json()
    return Object.fromEntries(
      data.resultados.map((resultado) => [resultado.preguntaId, resultado]),
    )
  }, [])

  const submitAll = useCallback(async () => {
    if (!preguntas) return
    setLoading(true)
    setError(null)
    try {
      const nextResultados = await gradeBatch(
        preguntas.map((p) => ({
          preguntaId: p.id,
          userAnswer: answers[p.id] ?? '',
        })),
      )
      setResultados(nextResultados)
      setFinished(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [preguntas, answers, gradeBatch])

  function toggleUnidad(id: string) {
    setSelectedUnidades((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  // --- Configuración ---
  if (!preguntas) {
    return (
      <ConstructivistCard className="space-y-4">
        <div>
          <p className="font-bold">Modo</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['practica', 'examen-tiempo', 'general'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`border-2 border-ink px-3 py-1 text-sm font-semibold ${
                  mode === m ? 'bg-primary text-paper' : 'bg-paper'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-bold" htmlFor="count">
            Cantidad de preguntas (0 = todas)
          </label>
          <input
            id="count"
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 block w-32 border-2 border-ink px-2 py-1"
          />
        </div>

        {unidades.length > 0 && (
          <div>
            <p className="font-bold">Unidades (vacío = todas)</p>
            <div className="mt-2 space-y-1">
              {unidades.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedUnidades.includes(u.id)}
                    onChange={() => toggleUnidad(u.id)}
                  />
                  {u.titulo} ({u.preguntas})
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-primary">{error}</p>}
        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="border-4 border-ink bg-primary px-4 py-2 font-bold text-paper shadow-hard-sm disabled:opacity-50"
        >
          {loading ? 'Cargando…' : 'Comenzar'}
        </button>
      </ConstructivistCard>
    )
  }

  // --- Resumen final ---
  if (finished) {
    const total = preguntas.length
    const correctas = Object.values(resultados).filter(
      (r) => r.correcta,
    ).length
    return (
      <ConstructivistCard className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Resultado</h2>
        <p className="text-lg">
          {correctas} / {total} (
          {total > 0 ? Math.round((correctas / total) * 100) : 0}%)
        </p>
        <button
          type="button"
          onClick={() => setPreguntas(null)}
          className="border-4 border-ink bg-paper px-4 py-2 font-bold shadow-hard-sm"
        >
          Volver a configurar
        </button>
      </ConstructivistCard>
    )
  }

  // --- Pregunta actual ---
  const pregunta = preguntas[index]
  const resultado = resultados[pregunta.id]
  const isPractice = mode === 'practica'

  function setAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [pregunta.id]: value }))
  }

  return (
    <ConstructivistCard className="space-y-4">
      <p className="text-sm text-ink/60">
        Pregunta {index + 1} de {preguntas.length}
      </p>
      <p className="font-bold">{pregunta.enunciado}</p>

      {pregunta.tipo === 'MULTIPLE_CHOICE' && (
        <div className="space-y-2">
          {pregunta.opciones.map((op) => (
            <label key={op} className="flex items-center gap-2">
              <input
                type="radio"
                name={pregunta.id}
                checked={answers[pregunta.id] === op}
                onChange={() => setAnswer(op)}
              />
              {op}
            </label>
          ))}
        </div>
      )}

      {pregunta.tipo === 'VERDADERO_FALSO' && (
        <div className="flex gap-3">
          {['true', 'false'].map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input
                type="radio"
                name={pregunta.id}
                checked={answers[pregunta.id] === v}
                onChange={() => setAnswer(v)}
              />
              {v === 'true' ? 'Verdadero' : 'Falso'}
            </label>
          ))}
        </div>
      )}

      {pregunta.tipo === 'RESPUESTA_CORTA' && (
        <input
          type="text"
          value={answers[pregunta.id] ?? ''}
          onChange={(e) => setAnswer(e.target.value)}
          className="block w-full border-2 border-ink px-2 py-1"
        />
      )}

      {isPractice && resultado && (
        <div
          className={`border-2 p-3 ${
            resultado.correcta
              ? 'border-green-700 bg-green-50'
              : 'border-primary bg-red-50'
          }`}
        >
          <p className="font-bold">
            {resultado.correcta ? '✓ Correcto' : '✗ Incorrecto'}
          </p>
          {!resultado.correcta && (
            <p className="text-sm">
              Respuesta: {resultado.respuestaCorrecta}
            </p>
          )}
          {resultado.explicacion && (
            <p className="mt-1 text-sm">{resultado.explicacion}</p>
          )}
        </div>
      )}

      {error && <p className="text-primary">{error}</p>}

      <div className="flex gap-3">
        {isPractice && !resultado && (
          <button
            type="button"
            onClick={() => grade(pregunta.id, answers[pregunta.id] ?? '')}
            className="border-4 border-ink bg-accent px-4 py-2 font-bold text-paper shadow-hard-sm"
          >
            Verificar
          </button>
        )}
        {index < preguntas.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="border-4 border-ink bg-paper px-4 py-2 font-bold shadow-hard-sm"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={submitAll}
            disabled={loading}
            className="border-4 border-ink bg-primary px-4 py-2 font-bold text-paper shadow-hard-sm"
          >
            {loading ? 'Corrigiendo…' : 'Finalizar'}
          </button>
        )}
      </div>
    </ConstructivistCard>
  )
}
