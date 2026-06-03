'use client'

import { cn } from '@/lib/utils'
import { CONTROL, CONTROL_ACTIVE } from './quizStyles'

export function OptionButton({
  label,
  index,
  selected,
  state,
  disabled,
  onClick,
}: {
  label: string
  index?: number
  selected: boolean
  state: 'idle' | 'correct' | 'wrong'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors cursor-pointer disabled:cursor-not-allowed',
        state === 'idle' && (selected ? CONTROL_ACTIVE : CONTROL),
        state === 'correct' && 'border border-emerald-400/50 bg-emerald-500/10',
        state === 'wrong' && (selected ? 'border border-rose-400/50 bg-rose-500/10' : 'border border-white/[0.06] bg-surface-3 opacity-55'),
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center text-xs font-bold tabular-nums transition-colors',
          state === 'correct'
            ? 'bg-emerald-500/20 text-emerald-300'
            : state === 'wrong' && selected
              ? 'bg-rose-500/20 text-rose-300'
              : selected
                ? 'bg-primary text-white'
                : 'bg-white/[0.06] text-white/44',
        )}
      >
        {typeof index === 'number' ? index + 1 : selected ? '•' : ''}
      </span>
      <span className="min-w-0 flex-1 break-words leading-relaxed text-white/82">{label}</span>
    </button>
  )
}
