// Dominio del Banco de Preguntas (JSON-en-bucket).
//
// Reemplaza al modelo viejo en DB. El formato de subida es el JSON que carga el
// admin: { title, units: [ { name, questions: [...] } ] }.
//
// Reglas de seguridad:
// - La corrección es SIEMPRE server-side. `answer` y `explanation` NUNCA se
//   envían al cliente al armar un set (ver toPublicQuestion).
// - El contenido subido se valida con Zod + chequeos semánticos antes de tocar
//   Storage, y se renderiza SIEMPRE como texto plano (nunca HTML), por lo que
//   no pasa por el sanitizador de HTML.

import { z } from 'zod'

export type QuestionType = 'single' | 'multiple' | 'truefalse'
export type QuizMode = 'practica' | 'examen' | 'general'

// --- Modelo con respuestas (vive solo server-side) -------------------------

export type BankQuestion =
  | {
      type: 'single'
      question: string
      options: string[]
      answer: number
      explanation: string
    }
  | {
      type: 'multiple'
      question: string
      options: string[]
      answer: number[]
      explanation: string
    }
  | {
      type: 'truefalse'
      question: string
      answer: boolean
      explanation: string
    }

export interface QuizBankUnit {
  name: string
  questions: BankQuestion[]
}

export interface QuizBankFile {
  title: string
  units: QuizBankUnit[]
}

// --- Modelo público (lo que viaja al cliente: SIN answer ni explanation) ---

export type PublicQuestion =
  | { id: string; type: 'single'; question: string; options: string[] }
  | { id: string; type: 'multiple'; question: string; options: string[] }
  | { id: string; type: 'truefalse'; question: string }

export type UserAnswer = number | number[] | boolean | null

export interface GradeResult {
  id: string
  unitName: string
  correcta: boolean
  respuestaCorrecta: number | number[] | boolean
  explicacion: string
}

export interface ResumenIntento {
  total: number
  correctas: number
  porcentaje: number
}

// Entrada del manifest (index.json) por materia. Lo que ve el selector de
// bancos: nunca incluye preguntas ni respuestas.
export interface QuizBankMeta {
  id: string
  nombre: string
  totalPreguntas: number
  subidoEl: string
  subidoPor: string
}

export const quizBankMetaSchema = z.object({
  id: z.string().min(1).max(64),
  nombre: z.string().min(1).max(120),
  totalPreguntas: z.number().int().min(0),
  subidoEl: z.string().min(1),
  subidoPor: z.string().min(1),
})


// --- Cotas (defensa contra payloads abusivos) ------------------------------

export const LIMITS = {
  title: 200,
  unitName: 200,
  question: 2000,
  option: 500,
  explanation: 4000,
  optionsMax: 10,
  unitsMax: 50,
  questionsPerUnit: 500,
  totalQuestions: 5000,
} as const

// --- Validación (forma + semántica) ----------------------------------------

const baseChoice = {
  question: z.string().trim().min(1).max(LIMITS.question),
  options: z
    .array(z.string().trim().min(1).max(LIMITS.option))
    .min(2)
    .max(LIMITS.optionsMax),
  explanation: z.string().trim().max(LIMITS.explanation).default(''),
}

const singleSchema = z
  .object({ type: z.literal('single'), ...baseChoice, answer: z.number().int() })
  .superRefine((q, ctx) => {
    if (q.answer < 0 || q.answer >= q.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `answer fuera de rango (0..${q.options.length - 1})`,
        path: ['answer'],
      })
    }
  })

const multipleSchema = z
  .object({
    type: z.literal('multiple'),
    ...baseChoice,
    answer: z.array(z.number().int()).min(1),
  })
  .superRefine((q, ctx) => {
    const unique = new Set(q.answer)
    if (unique.size !== q.answer.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'answer no puede tener índices repetidos',
        path: ['answer'],
      })
    }
    for (const idx of q.answer) {
      if (idx < 0 || idx >= q.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `answer fuera de rango (0..${q.options.length - 1})`,
          path: ['answer'],
        })
        break
      }
    }
  })

const trueFalseSchema = z.object({
  type: z.literal('truefalse'),
  question: z.string().trim().min(1).max(LIMITS.question),
  answer: z.boolean(),
  explanation: z.string().trim().max(LIMITS.explanation).default(''),
})

const questionSchema = z.discriminatedUnion('type', [
  singleSchema,
  multipleSchema,
  trueFalseSchema,
])

const unitSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.unitName),
  questions: z.array(questionSchema).min(1).max(LIMITS.questionsPerUnit),
})

export const quizBankSchema = z
  .object({
    title: z.string().trim().min(1).max(LIMITS.title),
    units: z.array(unitSchema).min(1).max(LIMITS.unitsMax),
  })
  .superRefine((bank, ctx) => {
    const total = bank.units.reduce((acc, u) => acc + u.questions.length, 0)
    if (total > LIMITS.totalQuestions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `El banco supera el máximo de ${LIMITS.totalQuestions} preguntas`,
        path: ['units'],
      })
    }
  })

export type QuizBankParseResult =
  | { ok: true; bank: QuizBankFile; totalPreguntas: number }
  | { ok: false; error: string }

// Parsea + valida un texto JSON crudo. NUNCA usa eval. Devuelve un error
// legible (sin filtrar internals) listo para mostrar al admin.
export function parseQuizBank(rawText: string): QuizBankParseResult {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }

  const parsed = quizBankSchema.safeParse(json)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path.length ? ` (${first.path.join(' › ')})` : ''
    return {
      ok: false,
      error: `JSON inválido: ${first?.message ?? 'estructura incorrecta'}${where}`,
    }
  }

  const bank = parsed.data as QuizBankFile
  const totalPreguntas = bank.units.reduce(
    (acc, u) => acc + u.questions.length,
    0,
  )
  return { ok: true, bank, totalPreguntas }
}

// --- Aplanado e identificación de preguntas --------------------------------

// Id estable y opaco para el cliente: {bankId}::{unitIdx}::{qIdx}.
// El cliente no puede forjar respuestas: el server SIEMPRE recarga el banco y
// busca la pregunta por este id antes de corregir.
const ID_SEP = '::'

export function makeQuestionId(
  bankId: string,
  unitIdx: number,
  qIdx: number,
): string {
  return `${bankId}${ID_SEP}${unitIdx}${ID_SEP}${qIdx}`
}

export function parseQuestionId(
  id: string,
): { bankId: string; unitIdx: number; qIdx: number } | null {
  const parts = id.split(ID_SEP)
  if (parts.length !== 3) return null
  const unitIdx = Number(parts[1])
  const qIdx = Number(parts[2])
  if (!Number.isInteger(unitIdx) || !Number.isInteger(qIdx)) return null
  return { bankId: parts[0], unitIdx, qIdx }
}

export interface FlatQuestion {
  id: string
  unitName: string
  question: BankQuestion
}

export function flattenBank(
  bankId: string,
  bank: QuizBankFile,
): FlatQuestion[] {
  const flat: FlatQuestion[] = []
  bank.units.forEach((unit, unitIdx) => {
    unit.questions.forEach((question, qIdx) => {
      flat.push({
        id: makeQuestionId(bankId, unitIdx, qIdx),
        unitName: unit.name,
        question,
      })
    })
  })
  return flat
}

export function getQuestionFromBank(
  bank: QuizBankFile,
  unitIdx: number,
  qIdx: number,
): BankQuestion | null {
  return bank.units[unitIdx]?.questions[qIdx] ?? null
}

// --- Set público ------------------------------------------------------------

export function toPublicQuestion(flat: FlatQuestion): PublicQuestion {
  const q = flat.question
  if (q.type === 'truefalse') {
    return { id: flat.id, type: 'truefalse', question: q.question }
  }
  return {
    id: flat.id,
    type: q.type,
    question: q.question,
    options: q.options,
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Arma el set del intento. Siempre mezcla: las preguntas se eligen al azar de
// todas las unidades, sin balanceo (igual que un examen real). `count <= 0` o
// `count` mayor al total => todas (igual mezcladas).
export function buildSet(
  flat: FlatQuestion[],
  _mode: QuizMode,
  count: number,
): FlatQuestion[] {
  const ordered = shuffle(flat)
  if (count <= 0 || count >= ordered.length) return ordered
  return ordered.slice(0, count)
}

// --- Corrección -------------------------------------------------------------

function sameIndexSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  if (sa.size !== a.length) return false
  return b.every((x) => sa.has(x))
}

export function isCorrect(
  question: BankQuestion,
  userAnswer: UserAnswer,
): boolean {
  switch (question.type) {
    case 'single':
      return (
        typeof userAnswer === 'number' && userAnswer === question.answer
      )
    case 'truefalse':
      return (
        typeof userAnswer === 'boolean' && userAnswer === question.answer
      )
    case 'multiple':
      return (
        Array.isArray(userAnswer) &&
        userAnswer.every((n) => typeof n === 'number') &&
        sameIndexSet(userAnswer, question.answer)
      )
  }
}

export function gradeQuestion(
  id: string,
  unitName: string,
  question: BankQuestion,
  userAnswer: UserAnswer,
): GradeResult {
  return {
    id,
    unitName,
    correcta: isCorrect(question, userAnswer),
    respuestaCorrecta: question.answer,
    explicacion: question.explanation,
  }
}

export function resumirIntento(results: GradeResult[]): ResumenIntento {
  const total = results.length
  const correctas = results.filter((r) => r.correcta).length
  const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0
  return { total, correctas, porcentaje }
}
