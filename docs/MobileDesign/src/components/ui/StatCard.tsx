import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DarkCard } from '@/components/ui/DarkCard'

interface StatCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  icon: ReactNode
  label: string
  value: ReactNode
  meta?: ReactNode
  progress?: number
  chipClassName?: string
  progressClassName?: string
  variant?: 'default' | 'interactive'
}

export function StatCard({
  icon,
  label,
  value,
  meta,
  progress,
  chipClassName,
  progressClassName,
  variant = 'default',
  className,
  ...props
}: StatCardProps) {
  const progressValue =
    typeof progress === 'number'
      ? Math.max(0, Math.min(100, Math.round(progress)))
      : null

  return (
    <DarkCard
      variant={variant}
      className={cn('p-5', className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            'inline-flex h-12 w-12 items-center justify-center rounded-none border border-white/10 bg-white/5 text-white',
            chipClassName,
          )}
        >
          {icon}
        </div>

        {meta ? (
          <div className="text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
            {meta}
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-4xl font-black tracking-tight text-white">
        {value}
      </p>

      {progressValue !== null ? (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">
            <span>Progreso</span>
            <span>{progressValue}%</span>
          </div>
          <div className="h-1.5 bg-white/5">
            <div
              className={cn(
                'h-full bg-white/80 transition-[width] duration-300',
                progressClassName,
              )}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      ) : null}
    </DarkCard>
  )
}
