import { describe, it, expect } from 'vitest'
import {
  normalizeAnswer,
  evaluatePregunta,
  toPreguntaPublica,
  buildQuizSet,
  resumirIntento,
  corregir,
  type PreguntaQuiz,
} from './quiz'

function makePregunta(overrides: Partial<PreguntaQuiz> = {}): PreguntaQuiz {
  return {
    id: 'test-id',
    tipo: 'RESPUESTA_CORTA',
    enunciado: '¿Qué es una variable?',
    opciones: [],
    respuestaCorrecta: 'contenedor de datos',
    explicacion: 'Una variable almacena datos.',
    ...overrides,
  }
}

describe('normalizeAnswer', () => {
  it('trim, lowercase, coma a punto', () => {
    expect(normalizeAnswer('  3,14  ')).toBe('3.14')
    expect(normalizeAnswer('HOLA')).toBe('hola')
    expect(normalizeAnswer(null)).toBe('')
    expect(normalizeAnswer(undefined)).toBe('')
  })
})

describe('evaluatePregunta — RESPUESTA_CORTA', () => {
  const pregunta = makePregunta({ respuestaCorrecta: 'contenedor de datos' })

  it('acierta con respuesta normalizada', () => {
    expect(evaluatePregunta(pregunta, '  Contenedor de Datos  ')).toBe(true)
  })

  it('falla con respuesta incorrecta', () => {
    expect(evaluatePregunta(pregunta, 'no sé')).toBe(false)
  })

  it('falla con respuesta vacía', () => {
    expect(evaluatePregunta(pregunta, '')).toBe(false)
    expect(evaluatePregunta(pregunta, null)).toBe(false)
  })
})

describe('evaluatePregunta — VERDADERO_FALSO', () => {
  const preguntaTrue = makePregunta({ tipo: 'VERDADERO_FALSO', respuestaCorrecta: 'true' })
  const preguntaFalse = makePregunta({ tipo: 'VERDADERO_FALSO', respuestaCorrecta: 'false' })

  it('acierta con el booleano correcto', () => {
    expect(evaluatePregunta(preguntaTrue, 'true')).toBe(true)
    expect(evaluatePregunta(preguntaFalse, 'false')).toBe(true)
  })

  it('falla con el booleano incorrecto', () => {
    expect(evaluatePregunta(preguntaTrue, 'false')).toBe(false)
    expect(evaluatePregunta(preguntaFalse, 'true')).toBe(false)
  })

  it('falla con valor no booleano', () => {
    expect(evaluatePregunta(preguntaTrue, 'si')).toBe(false)
    expect(evaluatePregunta(preguntaTrue, '1')).toBe(false)
    expect(evaluatePregunta(preguntaTrue, '')).toBe(false)
  })
})

describe('evaluatePregunta — MULTIPLE_CHOICE', () => {
  const pregunta = makePregunta({
    tipo: 'MULTIPLE_CHOICE',
    opciones: ['Java', 'Python', 'TypeScript'],
    respuestaCorrecta: 'TypeScript',
  })

  it('acierta con la opción correcta (case-insensitive)', () => {
    expect(evaluatePregunta(pregunta, 'TypeScript')).toBe(true)
    expect(evaluatePregunta(pregunta, 'typescript')).toBe(true)
    expect(evaluatePregunta(pregunta, '  TypeScript  ')).toBe(true)
  })

  it('falla con otra opción', () => {
    expect(evaluatePregunta(pregunta, 'Java')).toBe(false)
    expect(evaluatePregunta(pregunta, 'Python')).toBe(false)
  })

  it('falla con respuesta vacía', () => {
    expect(evaluatePregunta(pregunta, '')).toBe(false)
  })
})

describe('toPreguntaPublica', () => {
  it('omite respuestaCorrecta y explicacion', () => {
    const pregunta = makePregunta({
      tipo: 'MULTIPLE_CHOICE',
      opciones: ['a', 'b'],
      respuestaCorrecta: 'a',
      explicacion: 'porque sí',
    })
    const publica = toPreguntaPublica(pregunta)
    expect(publica).not.toHaveProperty('respuestaCorrecta')
    expect(publica).not.toHaveProperty('explicacion')
    expect(publica).toMatchObject({ id: 'test-id', tipo: 'MULTIPLE_CHOICE', opciones: ['a', 'b'] })
  })
})

describe('corregir', () => {
  it('devuelve siempre respuestaCorrecta y explicacion (diseño intencional)', () => {
    const pregunta = makePregunta({ respuestaCorrecta: 'contenedor de datos', explicacion: 'explicación' })
    const resultado = corregir(pregunta, 'mal')
    expect(resultado.correcta).toBe(false)
    expect(resultado.respuestaCorrecta).toBe('contenedor de datos')
    expect(resultado.explicacion).toBe('explicación')
  })
})

describe('buildQuizSet', () => {
  const preguntas = Array.from({ length: 10 }, (_, i) =>
    makePregunta({ id: `p${i}` }),
  )

  it('modo practica conserva el orden', () => {
    const set = buildQuizSet(preguntas, 'practica', 5)
    expect(set.map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4'])
  })

  it('count <= 0 devuelve todas', () => {
    expect(buildQuizSet(preguntas, 'practica', 0)).toHaveLength(10)
  })

  it('count >= total devuelve todas', () => {
    expect(buildQuizSet(preguntas, 'general', 100)).toHaveLength(10)
  })

  it('modo general aplica slicing', () => {
    const set = buildQuizSet(preguntas, 'general', 3)
    expect(set).toHaveLength(3)
  })
})

describe('resumirIntento', () => {
  it('calcula porcentaje correctamente', () => {
    const resultados = [
      { preguntaId: '1', correcta: true, explicacion: '', respuestaCorrecta: '' },
      { preguntaId: '2', correcta: false, explicacion: '', respuestaCorrecta: '' },
      { preguntaId: '3', correcta: true, explicacion: '', respuestaCorrecta: '' },
    ]
    expect(resumirIntento(resultados)).toEqual({ total: 3, correctas: 2, porcentaje: 67 })
  })

  it('sin resultados devuelve 0%', () => {
    expect(resumirIntento([])).toEqual({ total: 0, correctas: 0, porcentaje: 0 })
  })
})
