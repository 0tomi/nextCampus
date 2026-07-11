'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'

export function ResourceOrderActions({
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  index: number
  total: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onMoveUp(index)}
        disabled={index === 0}
        title="Subir"
        aria-label="Subir"
        className="inline-flex h-5 w-6 cursor-pointer items-center justify-center rounded-t border border-white/8 bg-surface-0 text-white/40 transition-colors enabled:hover:bg-white/5 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronUp className="size-3" />
      </button>
      <button
        type="button"
        onClick={() => onMoveDown(index)}
        disabled={index === total - 1}
        title="Bajar"
        aria-label="Bajar"
        className="inline-flex h-5 w-6 cursor-pointer items-center justify-center rounded-b border-x border-b border-white/8 bg-surface-0 text-white/40 transition-colors enabled:hover:bg-white/5 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronDown className="size-3" />
      </button>
    </div>
  )
}
