'use client'

import { Layers } from 'lucide-react'
import { DarkCard } from '@/components/ui/DarkCard'

export function QuizEmptyState() {
  return (
    <DarkCard className="px-6 py-16 text-center">
      <span className="mx-auto flex size-12 items-center justify-center border border-white/[0.06] bg-surface-3">
        <Layers className="size-5 text-white/28" />
      </span>
      <p className="mt-5 text-lg font-black tracking-tight text-white">Todavía no hay preguntas para practicar</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/48">
        Cuando el equipo de la materia cargue un banco de preguntas, vas a poder practicar acá.
      </p>
    </DarkCard>
  )
}
