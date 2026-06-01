import type { Resultado } from './quizTypes'

export function optionState(resultado: Resultado | undefined, value: number | boolean): 'idle' | 'correct' | 'wrong' {
  if (!resultado) return 'idle'
  const correcta = resultado.respuestaCorrecta
  const isCorrectOption = Array.isArray(correcta) ? typeof value === 'number' && correcta.includes(value) : correcta === value
  return isCorrectOption ? 'correct' : 'wrong'
}
