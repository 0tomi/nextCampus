// Lógica de quiz portada/adaptada de la SPA (src/lib/study.ts) al modelo
// init.md: materia { unidad { tipo; pregunta; respuestas; explicación } }.
// La corrección es SIEMPRE server-side; las respuestas correctas nunca se
// envían al cliente al armar un set.

import type { Pregunta, TipoPregunta } from '@/generated/prisma/client'

export type QuizMode = 'examen-tiempo' | 'practica' | 'general'

// Pregunta tal como se envía al cliente: SIN respuestaCorrecta ni explicación.
export interface PreguntaPublica {
  id: string
  tipo: TipoPregunta
  enunciado: string
  opciones: string[]
}

export interface ResultadoRespuesta {
  preguntaId: string
  correcta: boolean
  explicacion: string
  respuestaCorrecta: string
}

export interface ResumenIntento {
  total: number
  correctas: number
  porcentaje: number
}

function parseOpciones(opciones: Pregunta['opciones']): string[] {
  if (Array.isArray(opciones)) {
    return opciones.filter((o): o is string => typeof o === 'string')
  }
  return []
}

export function toPreguntaPublica(pregunta: Pregunta): PreguntaPublica {
  return {
    id: pregunta.id,
    tipo: pregunta.tipo,
    enunciado: pregunta.enunciado,
    opciones: parseOpciones(pregunta.opciones),
  }
}

export function normalizeAnswer(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(',', '.')
}

// Evalúa una respuesta contra la pregunta. Núcleo de corrección server-side.
export function evaluatePregunta(pregunta: Pregunta, answer: unknown): boolean {
  const given = normalizeAnswer(answer)
  const expected = normalizeAnswer(pregunta.respuestaCorrecta)
  if (given.length === 0) return false
  return given === expected
}

export function corregir(
  pregunta: Pregunta,
  answer: unknown,
): ResultadoRespuesta {
  return {
    preguntaId: pregunta.id,
    correcta: evaluatePregunta(pregunta, answer),
    explicacion: pregunta.explicacion,
    respuestaCorrecta: pregunta.respuestaCorrecta,
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

// Arma el set de un intento. `count <= 0` => todas las preguntas.
// `examen-tiempo` y `general` mezclan; `practica` conserva el orden.
export function buildQuizSet(
  preguntas: Pregunta[],
  mode: QuizMode,
  count: number,
): Pregunta[] {
  const ordered = mode === 'practica' ? preguntas : shuffle(preguntas)
  if (count <= 0 || count >= ordered.length) return ordered
  return ordered.slice(0, count)
}

export function resumirIntento(
  resultados: ResultadoRespuesta[],
): ResumenIntento {
  const total = resultados.length
  const correctas = resultados.filter((r) => r.correcta).length
  const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0
  return { total, correctas, porcentaje }
}
