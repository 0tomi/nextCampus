export type QuizMode = 'practica' | 'examen' | 'ranked'
export type QuizPhase = 'config' | 'ready' | 'running' | 'done'

export interface UnidadInfo {
  nombre: string
  totalPreguntas: number
}

export interface BancoInfo {
  id: string
  nombre: string
  totalPreguntas: number
  unidades?: UnidadInfo[]
  /** Autor del banco, para gatear el borrado por propiedad. */
  subidoPorId?: string | null
  /** Nombre de quien subió el banco, resuelto por email. Null si no se ubica. */
  subidoPorNombre?: string | null
}

export interface PublicQuestionOption {
  id: number
  label: string
}

export interface PublicQuestion {
  id: string
  type: 'single' | 'multiple' | 'truefalse'
  question: string
  options?: PublicQuestionOption[]
}

export interface Resultado {
  id: string
  unitName: string
  correcta: boolean
  respuestaCorrecta: number | number[] | boolean
  explicacion: string
}

export interface RankedTopItem {
  position: number
  participantName: string
  correctAnswers: number
  totalQuestions: number
  percentage: number
  durationSeconds: number
}

export type RankedHistoryTrend = 'improved' | 'declined' | 'equal' | 'first' | 'empty'

export interface RankedHistoryAttemptView {
  correctAnswers: number
  totalQuestions: number
  percentage: number
  durationSeconds: number
  finishedAt: string
}

export interface RankedHistorySummaryView {
  totalAttempts: number
  bestPercentage: number
  bestDurationSeconds: number
  latestPercentage: number
  latestDurationSeconds: number
  changeVsPrevious: number | null
  trend: RankedHistoryTrend
  position: number | null
  message: string
}

export interface RankedHistory {
  participantName: string
  summary: RankedHistorySummaryView
  attempts: RankedHistoryAttemptView[]
}

export interface RankedSummary {
  validForRanking: boolean
  invalidReason?: string | null
  correctAnswers: number
  totalQuestions: number
  percentage: number
  durationSeconds: number
}

export type UserAnswer = number | number[] | boolean | null
