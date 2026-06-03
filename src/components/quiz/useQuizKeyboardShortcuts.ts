'use client'

import { useEffect } from 'react'
import type { PublicQuestion, Resultado, UserAnswer } from './quizTypes'

export function useQuizKeyboardShortcuts({
  answers,
  canAdvance,
  enabled,
  index,
  isPractica,
  pregunta,
  resultado,
  onAnswer,
  onNext,
  onPrevious,
  onVerify,
}: {
  answers: Record<string, UserAnswer>
  canAdvance: boolean
  enabled: boolean
  index: number
  isPractica: boolean
  pregunta: PublicQuestion | undefined
  resultado: Resultado | undefined
  onAnswer: (answer: UserAnswer) => void
  onNext: () => void
  onPrevious: () => void
  onVerify: () => void
}) {
  useEffect(() => {
    if (!enabled || !pregunta) return

    const currentPregunta = pregunta

    function handleQuizShortcut(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' && index > 0) {
        onPrevious()
        return
      }

      if (event.key === 'ArrowRight' && canAdvance) {
        onNext()
        return
      }

      if (event.key === 'Enter') {
        if (isPractica && !resultado) onVerify()
        else if (canAdvance) onNext()
        return
      }

      if (resultado) return

      if (currentPregunta.type === 'truefalse') {
        if (event.key.toLowerCase() === 'v') onAnswer(true)
        if (event.key.toLowerCase() === 'f') onAnswer(false)
        return
      }

      const optionNumber = Number(event.key)
      if (!Number.isInteger(optionNumber) || optionNumber < 1 || !currentPregunta.options || optionNumber > currentPregunta.options.length) {
        return
      }

      const option = currentPregunta.options[optionNumber - 1]
      if (!option) return
      if (currentPregunta.type === 'single') {
        onAnswer(option.id)
        return
      }

      const current = Array.isArray(answers[currentPregunta.id]) ? (answers[currentPregunta.id] as number[]) : []
      onAnswer(current.includes(option.id) ? current.filter((item) => item !== option.id) : [...current, option.id])
    }

    window.addEventListener('keydown', handleQuizShortcut)
    return () => window.removeEventListener('keydown', handleQuizShortcut)
  }, [answers, canAdvance, enabled, index, isPractica, onAnswer, onNext, onPrevious, onVerify, pregunta, resultado])
}
