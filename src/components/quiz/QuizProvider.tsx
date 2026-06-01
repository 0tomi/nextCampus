'use client'

import { createContext, use, useCallback, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { createInitialQuizState, quizReducer, type QuizState } from './quizReducer'
import type { BancoInfo, PublicQuestion, Resultado, UserAnswer } from './quizTypes'
import { useExamTimer } from './useExamTimer'
import { useQuizKeyboardShortcuts } from './useQuizKeyboardShortcuts'

type QuizActions = {
  closeExitDialog: () => void
  closeSubmitDialog: () => void
  finish: () => void
  next: () => void
  openExitDialog: () => void
  openSubmitDialog: () => void
  previous: () => void
  reset: () => void
  setAnswer: (answer: UserAnswer) => void
  setCount: (count: number) => void
  setMode: (mode: QuizState['mode']) => void
  setTimeLimit: (minutes: number) => void
  start: () => void
  toggleBanco: (id: string) => void
  toggleUnit: (nombre: string) => void
  verify: () => void
}

type QuizContextValue = {
  actions: QuizActions
  availableUnits: Array<{ nombre: string; totalPreguntas: number }>
  bancos: BancoInfo[]
  canAdvance: boolean
  isLast: boolean
  isPractica: boolean
  maxPreguntas: number
  progreso: number
  pregunta: PublicQuestion | undefined
  respondida: boolean
  resultado: Resultado | undefined
  state: QuizState
  subjectSlug: string
  yearId?: string
}

const QuizContext = createContext<QuizContextValue | null>(null)

export function useQuiz() {
  const context = use(QuizContext)
  if (!context) {
    throw new Error('useQuiz debe usarse dentro de QuizProvider')
  }
  return context
}

export function QuizProvider({
  bancos,
  children,
  subjectSlug,
  yearId,
}: {
  bancos: BancoInfo[]
  children: ReactNode
  subjectSlug: string
  yearId?: string
}) {
  const defaultBancoIds = useMemo(() => (bancos.length === 1 ? [bancos[0].id] : []), [bancos])
  const [state, dispatch] = useReducer(quizReducer, defaultBancoIds, createInitialQuizState)

  const availableUnits = useMemo(() => {
    const unitsMap = new Map<string, number>()
    const selectedSet = new Set(state.selectedBancos)

    for (const banco of bancos) {
      if (!selectedSet.has(banco.id)) continue
      for (const unit of banco.unidades ?? []) {
        unitsMap.set(unit.nombre, (unitsMap.get(unit.nombre) ?? 0) + unit.totalPreguntas)
      }
    }

    return Array.from(unitsMap.entries()).map(([nombre, totalPreguntas]) => ({ nombre, totalPreguntas }))
  }, [bancos, state.selectedBancos])

  const maxPreguntas = useMemo(
    () => availableUnits.filter((unit) => !state.excludedUnits.includes(unit.nombre)).reduce((acc, unit) => acc + unit.totalPreguntas, 0),
    [availableUnits, state.excludedUnits],
  )

  const pregunta = state.preguntas[state.index]
  const resultado = pregunta ? state.resultados[pregunta.id] : undefined
  const isPractica = state.mode === 'practica'
  const isLast = state.index === state.preguntas.length - 1
  const canAdvance = isPractica ? Boolean(resultado) : true
  const respondida = pregunta ? state.answers[pregunta.id] !== undefined && state.answers[pregunta.id] !== null : false
  const progreso = state.preguntas.length > 0 ? ((state.index + 1) / state.preguntas.length) * 100 : 0

  const start = useCallback(async () => {
    if (state.selectedBancos.length === 0) {
      dispatch({ type: 'SET_ERROR', error: 'Elegí al menos un banco de preguntas.' })
      return
    }

    const activeUnits = availableUnits.flatMap((unit) => (state.excludedUnits.includes(unit.nombre) ? [] : [unit.nombre]))
    if (activeUnits.length === 0) {
      dispatch({ type: 'SET_ERROR', error: 'Elegí al menos una unidad.' })
      return
    }

    dispatch({ type: 'START_REQUEST' })
    try {
      const qs = new URLSearchParams({
        subject: subjectSlug,
        banks: state.selectedBancos.join(','),
        mode: state.mode,
        count: String(state.count),
      })
      for (const name of activeUnits) qs.append('units', name)

      const res = await fetch(`/api/quiz/set?${qs.toString()}`)
      if (!res.ok) throw new Error('No se pudo cargar el quiz.')

      const data: { preguntas: PublicQuestion[] } = await res.json()
      if (data.preguntas.length === 0) throw new Error('No hay preguntas para esa selección.')

      dispatch({
        type: 'START_SUCCESS',
        preguntas: data.preguntas,
        timeLeft: state.mode === 'examen' ? state.timeLimit * 60 : null,
      })
    } catch (error) {
      dispatch({ type: 'REQUEST_FAILURE', error: error instanceof Error ? error.message : 'Error inesperado.' })
    }
  }, [availableUnits, state.count, state.excludedUnits, state.mode, state.selectedBancos, state.timeLimit, subjectSlug])

  const setAnswer = useCallback(
    (answer: UserAnswer) => {
      if (!pregunta || state.resultados[pregunta.id]) return
      dispatch({ type: 'SET_ANSWER', questionId: pregunta.id, answer })
    },
    [pregunta, state.resultados],
  )

  const verify = useCallback(async () => {
    if (!pregunta) return

    dispatch({ type: 'VERIFY_REQUEST' })
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectSlug,
          answers: [{ id: pregunta.id, answer: state.answers[pregunta.id] ?? null }],
        }),
      })
      if (!res.ok) throw new Error('No se pudo corregir.')

      const data: { resultados: Resultado[] } = await res.json()
      dispatch({ type: 'VERIFY_SUCCESS', resultado: data.resultados[0] })
    } catch (error) {
      dispatch({ type: 'REQUEST_FAILURE', error: error instanceof Error ? error.message : 'Error inesperado.' })
    }
  }, [pregunta, state.answers, subjectSlug])

  const finish = useCallback(async () => {
    dispatch({ type: 'FINISH_REQUEST' })
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectSlug,
          answers: state.preguntas.map((question) => ({ id: question.id, answer: state.answers[question.id] ?? null })),
        }),
      })
      if (!res.ok) throw new Error('No se pudo corregir el quiz.')

      const data: { resultados: Resultado[] } = await res.json()
      dispatch({ type: 'FINISH_SUCCESS', resultados: Object.fromEntries(data.resultados.map((item) => [item.id, item])) })
    } catch (error) {
      dispatch({ type: 'REQUEST_FAILURE', error: error instanceof Error ? error.message : 'Error inesperado.' })
    }
  }, [state.answers, state.preguntas, subjectSlug])

  const next = useCallback(() => {
    if (isLast) {
      void finish()
      return
    }
    dispatch({ type: 'NEXT_INDEX' })
  }, [finish, isLast])

  const actions = useMemo<QuizActions>(
    () => ({
      closeExitDialog: () => dispatch({ type: 'CLOSE_EXIT_DIALOG' }),
      closeSubmitDialog: () => dispatch({ type: 'CLOSE_SUBMIT_DIALOG' }),
      finish: () => void finish(),
      next,
      openExitDialog: () => dispatch({ type: 'OPEN_EXIT_DIALOG' }),
      openSubmitDialog: () => dispatch({ type: 'OPEN_SUBMIT_DIALOG' }),
      previous: () => dispatch({ type: 'PREV_INDEX' }),
      reset: () => dispatch({ type: 'RESET' }),
      setAnswer,
      setCount: (count) => dispatch({ type: 'SET_COUNT', count }),
      setMode: (mode) => dispatch({ type: 'SET_MODE', mode }),
      setTimeLimit: (minutes) => dispatch({ type: 'SET_TIME_LIMIT', minutes }),
      start: () => void start(),
      toggleBanco: (id) => dispatch({ type: 'TOGGLE_BANCO', id }),
      toggleUnit: (nombre) => dispatch({ type: 'TOGGLE_UNIT', nombre }),
      verify: () => void verify(),
    }),
    [finish, next, setAnswer, start, verify],
  )

  useExamTimer({
    enabled: state.phase === 'running' && state.mode === 'examen' && state.timeLeft !== null,
    timeLeft: state.timeLeft,
    onExpire: actions.finish,
    onTick: () => dispatch({ type: 'TICK' }),
  })

  useQuizKeyboardShortcuts({
    answers: state.answers,
    canAdvance,
    enabled: state.phase === 'running',
    index: state.index,
    isPractica,
    pregunta,
    resultado,
    onAnswer: setAnswer,
    onNext: next,
    onPrevious: actions.previous,
    onVerify: actions.verify,
  })

  const value = useMemo<QuizContextValue>(
    () => ({
      actions,
      availableUnits,
      bancos,
      canAdvance,
      isLast,
      isPractica,
      maxPreguntas,
      progreso,
      pregunta,
      respondida,
      resultado,
      state,
      subjectSlug,
      yearId,
    }),
    [actions, availableUnits, bancos, canAdvance, isLast, isPractica, maxPreguntas, pregunta, progreso, respondida, resultado, state, subjectSlug, yearId],
  )

  return <QuizContext value={value}>{children}</QuizContext>
}
