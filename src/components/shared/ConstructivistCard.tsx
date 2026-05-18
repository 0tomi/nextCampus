import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ConstructivistCardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'highlighted'
}

export function ConstructivistCard({
  children,
  className,
  variant = 'default',
}: ConstructivistCardProps) {
  return (
    <div
      className={cn(
        'border-4 border-ink bg-paper p-6',
        variant === 'default'
          ? 'shadow-hard-sm'
          : 'border-primary shadow-hard',
        className,
      )}
    >
      {children}
    </div>
  )
}
