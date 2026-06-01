'use client'

import type { PublicQuestion, Resultado } from './quizTypes'

export function AnswerSummary({ question, resultado }: { question: PublicQuestion; resultado: Resultado | undefined }) {
  if (!resultado) return null

  const correcta = resultado.respuestaCorrecta
  const texto = formatCorrectAnswer(question, correcta)

  return (
    <p className="mt-2 text-sm text-white/48">
      Respuesta correcta: <span className="font-semibold text-white/82">{texto}</span>
    </p>
  )
}

function formatCorrectAnswer(question: PublicQuestion, correcta: number | number[] | boolean) {
  if (typeof correcta === 'boolean') return correcta ? 'Verdadero' : 'Falso'
  if (Array.isArray(correcta)) return correcta.map((index) => question.options?.[index] ?? `Opción ${index + 1}`).join(', ')
  return question.options?.[correcta] ?? `Opción ${correcta + 1}`
}
