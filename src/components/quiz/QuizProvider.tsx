'use client'

import { createContext, use, useCallback, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { getRankedQuestionCount, isRankedBankEligible, RANKED_NAME_STORAGE_KEY, validateParticipantName, type RankedInvalidationReason } from '@/lib/domain/ranked-quiz'
import { createInitialQuizState, quizReducer, type QuizState } from './quizReducer'
import { fetchRankedHistory } from './rankedHistoryClient'
import type { BancoInfo, PublicQuestion, RankedSummary, RankedTopItem, Resultado, UserAnswer } from './quizTypes'
import { useExamTimer } from './useExamTimer'
import { useQuizKeyboardShortcuts } from './useQuizKeyboardShortcuts'

type QuizActions = {
  closeExitDialog: () => void
  closeHistory: () => void
  closeSubmitDialog: () => void
  enterRanked: () => void
  finish: () => void
  loadHistory: (name: string) => void
  next: () => void
  openExitDialog: () => void
  openHistory: () => void
  openSubmitDialog: () => void
  previous: () => void
  reset: () => void
  setAnswer: (answer: UserAnswer) => void
  setCount: (count: number) => void
  setMode: (mode: QuizState['mode']) => void
  setRankedName: (name: string) => void
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
  isRanked: boolean
  maxPreguntas: number
  rankedQuestionCount: number
  rankedSelectedBank: BancoInfo | undefined
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

type QuizProviderProps = {
  bancos: BancoInfo[]
  children: ReactNode
  subjectSlug: string
  yearId?: string
}

type QuizRuntimeParams = Omit<QuizProviderProps, 'children'>

export function QuizProvider({ bancos, children, subjectSlug, yearId }: QuizProviderProps) {
  const value = useQuizRuntime({ bancos, subjectSlug, yearId })
  return <QuizContext value={value}>{children}</QuizContext>
}

function useQuizRuntime({ bancos, subjectSlug, yearId }: QuizRuntimeParams): QuizContextValue {
  const defaultBancoIds = useMemo(() => (bancos.length === 1 ? [bancos[0].id] : []), [bancos])
  const [state, dispatch] = useReducer(quizReducer, defaultBancoIds, createInitialQuizState)

  useEffect(() => {
    const storedName = window.localStorage.getItem(RANKED_NAME_STORAGE_KEY)
    if (!storedName) return

    const participant = validateParticipantName(storedName)
    if (participant.ok) {
      dispatch({ type: 'SET_STORED_RANKED_NAME', name: participant.name })
      return
    }

    window.localStorage.removeItem(RANKED_NAME_STORAGE_KEY)
  }, [])

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

  const rankedSelectedBank = useMemo(() => bancos.find((banco) => banco.id === state.selectedBancos[0]), [bancos, state.selectedBancos])
  const rankedQuestionCount = rankedSelectedBank ? getRankedQuestionCount(rankedSelectedBank.totalPreguntas) : 0
  const pregunta = state.preguntas[state.index]
  const resultado = pregunta ? state.resultados[pregunta.id] : undefined
  const isPractica = state.mode === 'practica'
  const isRanked = state.mode === 'ranked'
  const isLast = state.index === state.preguntas.length - 1
  const canAdvance = isPractica ? Boolean(resultado) : true
  const respondida = pregunta ? state.answers[pregunta.id] !== undefined && state.answers[pregunta.id] !== null : false
  const progreso = state.preguntas.length > 0 ? ((state.index + 1) / state.preguntas.length) * 100 : 0

  const loadRankedTop = useCallback(
    async (bankId: string | undefined) => {
      if (!bankId) {
        dispatch({ type: 'RANKED_TOP_SUCCESS', items: [] })
        return
      }

      dispatch({ type: 'RANKED_TOP_REQUEST' })
      try {
        const res = await fetch(`/api/quiz/ranked/ranking?subject=${encodeURIComponent(subjectSlug)}&bank=${encodeURIComponent(bankId)}`)
        const data: { items?: RankedTopItem[] } = res.ok ? await res.json() : { items: [] }
        dispatch({ type: 'RANKED_TOP_SUCCESS', items: data.items ?? [] })
      } catch {
        dispatch({ type: 'RANKED_TOP_FAILURE' })
      }
    },
    [subjectSlug],
  )

  // Progreso con la identidad guardada: alimenta la tarjeta del resultado y la
  // vista por defecto del modal. La consulta de "otro nombre" vive local en el
  // modal y no toca este estado, así la tarjeta nunca muestra datos ajenos.
  const loadRankedHistory = useCallback(
    async (name: string) => {
      const bankId = state.selectedBancos[0]
      const lookupName = name.trim()
      if (!bankId || !lookupName) return

      dispatch({ type: 'RANKED_HISTORY_REQUEST', name: lookupName })
      try {
        const history = await fetchRankedHistory(subjectSlug, bankId, lookupName)
        dispatch({ type: 'RANKED_HISTORY_SUCCESS', history })
      } catch {
        dispatch({ type: 'RANKED_HISTORY_FAILURE' })
      }
    },
    [state.selectedBancos, subjectSlug],
  )

  const invalidateRankedAttempt = useCallback(
    (reason: RankedInvalidationReason, delivery: 'fetch' | 'beacon' = 'fetch') => {
      const attemptId = state.rankedAttemptId
      if (!attemptId || state.rankedInvalidated || !['ready', 'running'].includes(state.phase) || state.mode !== 'ranked') return

      dispatch({ type: 'RANKED_INVALIDATED' })
      const body = JSON.stringify({ attemptId, reason })
      if (delivery === 'beacon' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/quiz/ranked/invalidate', new Blob([body], { type: 'application/json' }))
        return
      }

      void fetch('/api/quiz/ranked/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    },
    [state.mode, state.phase, state.rankedAttemptId, state.rankedInvalidated],
  )

  useEffect(() => {
    if (state.phase !== 'running' || state.mode !== 'ranked' || !state.rankedAttemptId) return

    if (!document.fullscreenElement) {
      invalidateRankedAttempt('fullscreen_exit')
      return
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement) invalidateRankedAttempt('fullscreen_exit')
    }

    function handleVisibilityChange() {
      if (document.hidden) invalidateRankedAttempt('tab_hidden')
    }

    function handlePageHide() {
      invalidateRankedAttempt('page_unload', 'beacon')
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [invalidateRankedAttempt, state.mode, state.phase, state.rankedAttemptId])

  useEffect(() => {
    if (state.phase === 'done' && state.mode === 'ranked' && document.fullscreenElement) {
      void document.exitFullscreen()
    }
  }, [state.mode, state.phase])

  // Al terminar un ranked, traemos el progreso con el nombre guardado para
  // mostrar la tarjeta de comparación sin pedir otra acción.
  useEffect(() => {
    if (state.phase === 'done' && state.mode === 'ranked' && state.rankedName) {
      void loadRankedHistory(state.rankedName)
    }
  }, [loadRankedHistory, state.mode, state.phase, state.rankedName])

  const start = useCallback(async () => {
    if (state.selectedBancos.length === 0) {
      dispatch({ type: 'SET_ERROR', error: 'Elegí al menos un banco de preguntas.' })
      return
    }

    if (state.mode === 'ranked') {
      if (state.selectedBancos.length !== 1 || !rankedSelectedBank) {
        dispatch({ type: 'SET_ERROR', error: 'Elegí un banco para jugar ranked.' })
        return
      }
      if (!isRankedBankEligible(rankedSelectedBank.totalPreguntas)) {
        dispatch({ type: 'SET_ERROR', error: 'Este banco todavía no tiene suficientes preguntas para ranked.' })
        return
      }
      const participant = validateParticipantName(state.rankedName)
      if (!participant.ok) {
        dispatch({ type: 'SET_ERROR', error: participant.error })
        return
      }

      dispatch({ type: 'START_REQUEST' })
      try {
        const res = await fetch('/api/quiz/ranked/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: subjectSlug, bankId: rankedSelectedBank.id, name: participant.name }),
        })
        const data: { attemptId?: string; preguntas?: PublicQuestion[]; participantName?: string; error?: string } = await res.json()
        if (!res.ok || !data.preguntas || !data.attemptId) throw new Error(data.error ?? 'No se pudo cargar el ranked.')

        window.localStorage.setItem(RANKED_NAME_STORAGE_KEY, data.participantName ?? participant.name)
        dispatch({ type: 'RANKED_READY_SUCCESS', preguntas: data.preguntas, rankedAttemptId: data.attemptId, rankedName: data.participantName ?? participant.name })
      } catch (error) {
        dispatch({ type: 'REQUEST_FAILURE', error: error instanceof Error ? error.message : 'Error inesperado.' })
      }
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
  }, [availableUnits, rankedSelectedBank, state.count, state.excludedUnits, state.mode, state.rankedName, state.selectedBancos, state.timeLimit, subjectSlug])

  const enterRanked = useCallback(async () => {
    if (state.mode !== 'ranked' || state.phase !== 'ready') return

    dispatch({ type: 'ENTER_RANKED_REQUEST' })
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      dispatch({ type: 'ENTER_RANKED_SUCCESS' })
    } catch {
      dispatch({ type: 'REQUEST_FAILURE', error: 'Activá pantalla completa para iniciar el ranked.' })
    }
  }, [state.mode, state.phase])

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
      const endpoint = state.mode === 'ranked' ? '/api/quiz/ranked/finish' : '/api/quiz/answer'
      const body = state.mode === 'ranked'
        ? {
            subject: subjectSlug,
            attemptId: state.rankedAttemptId,
            answers: state.preguntas.map((question) => ({ id: question.id, answer: state.answers[question.id] ?? null })),
            clientInvalidated: state.rankedInvalidated,
          }
        : {
            subject: subjectSlug,
            answers: state.preguntas.map((question) => ({ id: question.id, answer: state.answers[question.id] ?? null })),
          }

      if (state.mode === 'ranked' && !state.rankedAttemptId) throw new Error('No se pudo corregir el ranked.')

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('No se pudo corregir el quiz.')

      const data: { resultados: Resultado[]; ranked?: RankedSummary } = await res.json()
      dispatch({ type: 'FINISH_SUCCESS', resultados: Object.fromEntries(data.resultados.map((item) => [item.id, item])), rankedSummary: data.ranked ?? null })
    } catch (error) {
      dispatch({ type: 'REQUEST_FAILURE', error: error instanceof Error ? error.message : 'Error inesperado.' })
    }
  }, [state.answers, state.mode, state.preguntas, state.rankedAttemptId, state.rankedInvalidated, subjectSlug])

  const next = useCallback(() => {
    if (isLast) {
      void finish()
      return
    }
    dispatch({ type: 'NEXT_INDEX' })
  }, [finish, isLast])

  const reset = useCallback(() => {
    if (['ready', 'running'].includes(state.phase) && state.mode === 'ranked') invalidateRankedAttempt('manual_exit')
    const shouldRefreshTop = state.mode === 'ranked'
    const bankId = state.selectedBancos[0]
    dispatch({ type: 'RESET' })
    if (shouldRefreshTop) void loadRankedTop(bankId)
  }, [invalidateRankedAttempt, loadRankedTop, state.mode, state.phase, state.selectedBancos])

  const openRankedHistory = useCallback(() => {
    dispatch({ type: 'OPEN_HISTORY' })
    // Recargamos con el banco y nombre actuales; mantenemos los datos previos
    // visibles mientras refresca para no parpadear a un esqueleto.
    if (!state.rankedHistoryLoading) {
      void loadRankedHistory(state.rankedHistoryName || state.rankedName)
    }
  }, [loadRankedHistory, state.rankedHistoryLoading, state.rankedHistoryName, state.rankedName])

  const actions = useMemo<QuizActions>(
    () => ({
      closeExitDialog: () => dispatch({ type: 'CLOSE_EXIT_DIALOG' }),
      closeHistory: () => dispatch({ type: 'CLOSE_HISTORY' }),
      closeSubmitDialog: () => dispatch({ type: 'CLOSE_SUBMIT_DIALOG' }),
      enterRanked: () => void enterRanked(),
      finish: () => void finish(),
      loadHistory: (name) => void loadRankedHistory(name),
      next,
      openExitDialog: () => dispatch({ type: 'OPEN_EXIT_DIALOG' }),
      openHistory: openRankedHistory,
      openSubmitDialog: () => dispatch({ type: 'OPEN_SUBMIT_DIALOG' }),
      previous: () => dispatch({ type: 'PREV_INDEX' }),
      reset,
      setAnswer,
      setCount: (count) => dispatch({ type: 'SET_COUNT', count }),
      setMode: (mode) => {
        dispatch({ type: 'SET_MODE', mode })
        if (mode === 'ranked') void loadRankedTop(state.selectedBancos[0])
      },
      setRankedName: (name) => dispatch({ type: 'SET_RANKED_NAME', name }),
      setTimeLimit: (minutes) => dispatch({ type: 'SET_TIME_LIMIT', minutes }),
      start: () => void start(),
      toggleBanco: (id) => {
        const willSelectRankedBank = state.mode === 'ranked' && !state.selectedBancos.includes(id)
        dispatch({ type: 'TOGGLE_BANCO', id })
        if (state.mode === 'ranked') void loadRankedTop(willSelectRankedBank ? id : undefined)
      },
      toggleUnit: (nombre) => dispatch({ type: 'TOGGLE_UNIT', nombre }),
      verify: () => void verify(),
    }),
    [enterRanked, finish, loadRankedHistory, loadRankedTop, next, openRankedHistory, reset, setAnswer, start, state.mode, state.selectedBancos, verify],
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
      isRanked,
      maxPreguntas,
      rankedQuestionCount,
      rankedSelectedBank,
      progreso,
      pregunta,
      respondida,
      resultado,
      state,
      subjectSlug,
      yearId,
    }),
    [actions, availableUnits, bancos, canAdvance, isLast, isPractica, isRanked, maxPreguntas, pregunta, progreso, rankedQuestionCount, rankedSelectedBank, respondida, resultado, state, subjectSlug, yearId],
  )

  return value
}
