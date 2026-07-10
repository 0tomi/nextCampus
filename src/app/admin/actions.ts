'use server'

export {
  createEvento,
  createEventoAction,
  updateEventoFechaAction,
  updateEventoAction,
  deleteEvento,
} from './actions/eventos'
export type { EventoActionState } from './actions/eventos'

export {
  createPeriodoAction,
  updatePeriodoAction,
  deletePeriodo,
  createCategoriaAction,
} from './actions/periodos'
export type { PeriodoActionState } from './actions/periodos'

export {
  createApunteAction,
  updateApunteAction,
  deleteApunteAction,
} from './actions/apuntes'
export type { ApunteActionState } from './actions/apuntes'

export {
  uploadQuizBankAction,
  deleteQuizBankAction,
} from './actions/quiz'
export type { QuizBankActionState } from './actions/quiz'

export {
  createYearAction,
  updateYearAction,
  deleteYearAction,
  getYearDeleteImpactAction,
} from './actions/years'
export type { YearActionState } from './actions/years'

export {
  createSubjectAction,
  createCommissionAction,
  updateSubjectAction,
  deleteSubjectAction,
  getSubjectDeleteImpactAction,
} from './actions/subjects'
export type { SubjectActionState, CommissionActionState } from './actions/subjects'

export { signOutAction } from './actions/session'
