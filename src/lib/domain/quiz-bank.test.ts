import { describe, it, expect } from 'vitest'
import {
  parseQuizBank,
  flattenBank,
  buildSet,
  isCorrect,
  gradeQuestion,
  resumirIntento,
  toPublicQuestion,
  makeQuestionId,
  parseQuestionId,
  type QuizBankFile,
  type BankQuestion,
} from './quiz-bank'

const VALID = {
  title: 'Materia X',
  units: [
    {
      name: 'Unidad 1',
      questions: [
        {
          type: 'single',
          question: '¿Capital de Francia?',
          options: ['Madrid', 'París', 'Roma'],
          answer: 1,
          explanation: 'París.',
        },
        {
          type: 'multiple',
          question: '¿Lenguajes?',
          options: ['Python', 'HTML', 'JavaScript'],
          answer: [0, 2],
          explanation: 'Python y JS.',
        },
        {
          type: 'truefalse',
          question: 'La Tierra rota en 24h exactas.',
          answer: false,
          explanation: 'Falso.',
        },
      ],
    },
  ],
}

describe('parseQuizBank', () => {
  it('acepta un banco válido', () => {
    const res = parseQuizBank(JSON.stringify(VALID))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.totalPreguntas).toBe(3)
  })

  it('rechaza JSON malformado sin lanzar', () => {
    const res = parseQuizBank('{ esto no es json')
    expect(res.ok).toBe(false)
  })

  it('rechaza single con answer fuera de rango', () => {
    const bad = structuredClone(VALID)
    bad.units[0].questions[0].answer = 9
    expect(parseQuizBank(JSON.stringify(bad)).ok).toBe(false)
  })

  it('rechaza multiple con índices repetidos', () => {
    const bad = structuredClone(VALID)
    bad.units[0].questions[1].answer = [0, 0]
    expect(parseQuizBank(JSON.stringify(bad)).ok).toBe(false)
  })

  it('rechaza truefalse con answer no booleano', () => {
    const bad = structuredClone(VALID)
    // @ts-expect-error fuerza tipo inválido para el test
    bad.units[0].questions[2].answer = 'false'
    expect(parseQuizBank(JSON.stringify(bad)).ok).toBe(false)
  })

  it('rechaza opción única (mínimo 2)', () => {
    const bad = structuredClone(VALID)
    bad.units[0].questions[0].options = ['Solo una']
    expect(parseQuizBank(JSON.stringify(bad)).ok).toBe(false)
  })

  it('rechaza banco sin unidades', () => {
    expect(parseQuizBank(JSON.stringify({ title: 'X', units: [] })).ok).toBe(
      false,
    )
  })
})

describe('ids', () => {
  it('roundtrip make/parse', () => {
    const id = makeQuestionId('bank-1', 2, 5)
    expect(parseQuestionId(id)).toEqual({
      bankId: 'bank-1',
      unitIdx: 2,
      qIdx: 5,
    })
  })

  it('rechaza ids malformados', () => {
    expect(parseQuestionId('solo-uno')).toBeNull()
  })
})

describe('toPublicQuestion', () => {
  it('no filtra answer ni explanation', () => {
    const bank = parseQuizBank(JSON.stringify(VALID))
    if (!bank.ok) throw new Error('banco inválido')
    const flat = flattenBank('b1', bank.bank)
    for (const f of flat) {
      const pub = toPublicQuestion(f)
      expect(pub).not.toHaveProperty('answer')
      expect(pub).not.toHaveProperty('explanation')
    }
  })

  it('truefalse no expone options', () => {
    const bank = parseQuizBank(JSON.stringify(VALID))
    if (!bank.ok) throw new Error('banco inválido')
    const flat = flattenBank('b1', bank.bank)
    const tf = flat.find((f) => f.question.type === 'truefalse')!
    expect(toPublicQuestion(tf)).not.toHaveProperty('options')
  })

  it('expone opciones con id original y label, mezclables sin filtrar respuestas', () => {
    const bank = parseQuizBank(JSON.stringify(VALID))
    if (!bank.ok) throw new Error('banco inválido')
    const flat = flattenBank('b1', bank.bank)
    const single = flat.find((f) => f.question.type === 'single')!
    const pub = toPublicQuestion(single)
    if (pub.type === 'truefalse') throw new Error('tipo inesperado')

    expect(pub.options).toHaveLength(3)
    expect(new Set(pub.options.map((option) => option.id))).toEqual(new Set([0, 1, 2]))
    expect(new Set(pub.options.map((option) => option.label))).toEqual(new Set(['Madrid', 'París', 'Roma']))
  })

})

describe('isCorrect', () => {
  const single: BankQuestion = {
    type: 'single',
    question: 'q',
    options: ['a', 'b'],
    answer: 1,
    explanation: '',
  }
  const multiple: BankQuestion = {
    type: 'multiple',
    question: 'q',
    options: ['a', 'b', 'c'],
    answer: [0, 2],
    explanation: '',
  }
  const tf: BankQuestion = {
    type: 'truefalse',
    question: 'q',
    answer: true,
    explanation: '',
  }

  it('single', () => {
    expect(isCorrect(single, 1)).toBe(true)
    expect(isCorrect(single, 0)).toBe(false)
    expect(isCorrect(single, null)).toBe(false)
  })

  it('multiple: igualdad de conjuntos, sin importar orden', () => {
    expect(isCorrect(multiple, [2, 0])).toBe(true)
    expect(isCorrect(multiple, [0])).toBe(false)
    expect(isCorrect(multiple, [0, 1, 2])).toBe(false)
  })

  it('truefalse: booleano estricto', () => {
    expect(isCorrect(tf, true)).toBe(true)
    expect(isCorrect(tf, false)).toBe(false)
    // @ts-expect-error string no es respuesta válida
    expect(isCorrect(tf, 'true')).toBe(false)
  })
})

describe('buildSet', () => {
  const bank = parseQuizBank(JSON.stringify(VALID))
  const flat = bank.ok ? flattenBank('b1', bank.bank) : []

  it('practica mezcla pero conserva el conjunto completo de preguntas', () => {
    const set = buildSet(flat, 'practica', 0)
    expect(set).toHaveLength(flat.length)
    expect(new Set(set.map((f) => f.id))).toEqual(
      new Set(flat.map((f) => f.id)),
    )
  })

  it('recorta a count eligiendo ids válidos del banco', () => {
    const allIds = new Set(flat.map((f) => f.id))
    const set = buildSet(flat, 'practica', 2)
    expect(set).toHaveLength(2)
    expect(set.every((f) => allIds.has(f.id))).toBe(true)
  })

  it('count recorta', () => {
    expect(buildSet(flat, 'general', 2)).toHaveLength(2)
  })

  it('count <= 0 devuelve todas', () => {
    expect(buildSet(flat, 'general', 0)).toHaveLength(3)
  })
})

describe('gradeQuestion + resumen', () => {
  it('corrige y resume', () => {
    const bank = parseQuizBank(JSON.stringify(VALID))
    if (!bank.ok) throw new Error('banco inválido')
    const flat = flattenBank('b1', bank.bank)
    const results = [
      gradeQuestion(flat[0].id, flat[0].unitName, flat[0].question, 1), // ok
      gradeQuestion(flat[1].id, flat[1].unitName, flat[1].question, [0, 2]), // ok
      gradeQuestion(flat[2].id, flat[2].unitName, flat[2].question, true), // mal (answer false)
    ]
    const resumen = resumirIntento(results)
    expect(resumen).toEqual({ total: 3, correctas: 2, porcentaje: 67 })
  })
})

// Tipado: el archivo es asignable a QuizBankFile.
const _typecheck: QuizBankFile = VALID as unknown as QuizBankFile
void _typecheck
