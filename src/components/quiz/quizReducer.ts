import type { PublicQuestion, QuizMode, QuizPhase, RankedSummary, RankedTopItem, Resultado, UserAnswer } from './quizTypes'

export type QuizState = {
  phase: QuizPhase
  mode: QuizMode
  count: number
  selectedBancos: string[]
  preguntas: PublicQuestion[]
  index: number
  answers: Record<string, UserAnswer>
  resultados: Record<string, Resultado>
  loading: boolean
  error: string | null
  timeLimit: number
  timeLeft: number | null
  showExitDialog: boolean
  showSubmitDialog: boolean
  excludedUnits: string[]
  rankedName: string
  rankedNameLocked: boolean
  rankedAttemptId: string | null
  rankedInvalidated: boolean
  rankedSummary: RankedSummary | null
  rankedTop: RankedTopItem[]
  rankedTopLoading: boolean
}

export type QuizAction =
  | { type: 'SET_MODE'; mode: QuizMode }
  | { type: 'SET_COUNT'; count: number }
  | { type: 'SET_TIME_LIMIT'; minutes: number }
  | { type: 'SET_RANKED_NAME'; name: string }
  | { type: 'SET_STORED_RANKED_NAME'; name: string }
  | { type: 'TOGGLE_BANCO'; id: string }
  | { type: 'TOGGLE_UNIT'; nombre: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'START_REQUEST' }
  | { type: 'START_SUCCESS'; preguntas: PublicQuestion[]; timeLeft: number | null; rankedAttemptId?: string | null; rankedName?: string }
  | { type: 'RANKED_READY_SUCCESS'; preguntas: PublicQuestion[]; rankedAttemptId: string; rankedName: string }
  | { type: 'ENTER_RANKED_REQUEST' }
  | { type: 'ENTER_RANKED_SUCCESS' }
  | { type: 'RANKED_INVALIDATED' }
  | { type: 'RANKED_TOP_REQUEST' }
  | { type: 'RANKED_TOP_SUCCESS'; items: RankedTopItem[] }
  | { type: 'RANKED_TOP_FAILURE' }
  | { type: 'VERIFY_REQUEST' }
  | { type: 'VERIFY_SUCCESS'; resultado: Resultado }
  | { type: 'FINISH_REQUEST' }
  | { type: 'FINISH_SUCCESS'; resultados: Record<string, Resultado>; rankedSummary?: RankedSummary | null }
  | { type: 'REQUEST_FAILURE'; error: string }
  | { type: 'SET_ANSWER'; questionId: string; answer: UserAnswer }
  | { type: 'NEXT_INDEX' }
  | { type: 'PREV_INDEX' }
  | { type: 'TICK' }
  | { type: 'OPEN_EXIT_DIALOG' }
  | { type: 'CLOSE_EXIT_DIALOG' }
  | { type: 'OPEN_SUBMIT_DIALOG' }
  | { type: 'CLOSE_SUBMIT_DIALOG' }
  | { type: 'RESET' }

export function createInitialQuizState(defaultBancoIds: string[]): QuizState {
  return {
    phase: 'config',
    mode: 'practica',
    count: 0,
    selectedBancos: defaultBancoIds,
    preguntas: [],
    index: 0,
    answers: {},
    resultados: {},
    loading: false,
    error: null,
    timeLimit: 60,
    timeLeft: null,
    showExitDialog: false,
    showSubmitDialog: false,
    excludedUnits: [],
    rankedName: '',
    rankedNameLocked: false,
    rankedAttemptId: null,
    rankedInvalidated: false,
    rankedSummary: null,
    rankedTop: [],
    rankedTopLoading: false,
  }
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
        selectedBancos: action.mode === 'ranked' ? state.selectedBancos.slice(0, 1) : state.selectedBancos,
        excludedUnits: action.mode === 'ranked' ? [] : state.excludedUnits,
        error: null,
      }
    case 'SET_COUNT':
      return { ...state, count: Math.max(0, action.count) }
    case 'SET_TIME_LIMIT':
      return { ...state, timeLimit: Math.max(1, action.minutes) }
    case 'SET_RANKED_NAME':
      if (state.rankedNameLocked) return state
      return { ...state, rankedName: action.name, error: null }
    case 'SET_STORED_RANKED_NAME':
      return { ...state, rankedName: action.name, rankedNameLocked: true, error: null }
    case 'TOGGLE_BANCO':
      if (state.mode === 'ranked') {
        return { ...state, selectedBancos: state.selectedBancos.includes(action.id) ? [] : [action.id], excludedUnits: [] }
      }
      return {
        ...state,
        selectedBancos: state.selectedBancos.includes(action.id)
          ? state.selectedBancos.filter((id) => id !== action.id)
          : [...state.selectedBancos, action.id],
      }
    case 'TOGGLE_UNIT':
      return {
        ...state,
        excludedUnits: state.excludedUnits.includes(action.nombre)
          ? state.excludedUnits.filter((nombre) => nombre !== action.nombre)
          : [...state.excludedUnits, action.nombre],
      }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'START_REQUEST':
    case 'ENTER_RANKED_REQUEST':
    case 'VERIFY_REQUEST':
    case 'FINISH_REQUEST':
      return { ...state, loading: true, error: null }
    case 'START_SUCCESS':
      return {
        ...state,
        phase: 'running',
        preguntas: action.preguntas,
        index: 0,
        answers: {},
        resultados: {},
        timeLeft: action.timeLeft,
        loading: false,
        error: null,
        showExitDialog: false,
        showSubmitDialog: false,
        rankedAttemptId: action.rankedAttemptId ?? null,
        rankedInvalidated: false,
        rankedSummary: null,
        rankedName: action.rankedName ?? state.rankedName,
      }
    case 'RANKED_READY_SUCCESS':
      return {
        ...state,
        phase: 'ready',
        preguntas: action.preguntas,
        index: 0,
        answers: {},
        resultados: {},
        timeLeft: null,
        loading: false,
        error: null,
        showExitDialog: false,
        showSubmitDialog: false,
        rankedAttemptId: action.rankedAttemptId,
        rankedInvalidated: false,
        rankedSummary: null,
        rankedName: action.rankedName,
        rankedNameLocked: true,
      }
    case 'ENTER_RANKED_SUCCESS':
      return { ...state, phase: 'running', loading: false, error: null }
    case 'RANKED_INVALIDATED':
      return { ...state, rankedInvalidated: true }
    case 'RANKED_TOP_REQUEST':
      return { ...state, rankedTopLoading: true }
    case 'RANKED_TOP_SUCCESS':
      return { ...state, rankedTop: action.items, rankedTopLoading: false }
    case 'RANKED_TOP_FAILURE':
      return { ...state, rankedTop: [], rankedTopLoading: false }
    case 'VERIFY_SUCCESS':
      return {
        ...state,
        loading: false,
        resultados: { ...state.resultados, [action.resultado.id]: action.resultado },
      }
    case 'FINISH_SUCCESS':
      return {
        ...state,
        phase: 'done',
        resultados: action.resultados,
        rankedSummary: action.rankedSummary ?? null,
        loading: false,
        error: null,
        showSubmitDialog: false,
      }
    case 'REQUEST_FAILURE':
      return { ...state, loading: false, error: action.error }
    case 'SET_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.answer },
      }
    case 'NEXT_INDEX':
      return { ...state, index: Math.min(state.index + 1, state.preguntas.length - 1) }
    case 'PREV_INDEX':
      return { ...state, index: Math.max(state.index - 1, 0) }
    case 'TICK':
      return { ...state, timeLeft: state.timeLeft !== null ? Math.max(0, state.timeLeft - 1) : null }
    case 'OPEN_EXIT_DIALOG':
      return { ...state, showExitDialog: true }
    case 'CLOSE_EXIT_DIALOG':
      return { ...state, showExitDialog: false }
    case 'OPEN_SUBMIT_DIALOG':
      return { ...state, showSubmitDialog: true }
    case 'CLOSE_SUBMIT_DIALOG':
      return { ...state, showSubmitDialog: false }
    case 'RESET':
      return {
        ...state,
        phase: 'config',
        preguntas: [],
        answers: {},
        resultados: {},
        index: 0,
        error: null,
        loading: false,
        timeLeft: null,
        showExitDialog: false,
        showSubmitDialog: false,
        rankedAttemptId: null,
        rankedInvalidated: false,
        rankedSummary: null,
      }
  }
}
