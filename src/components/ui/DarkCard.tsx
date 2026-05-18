import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

interface DarkCardProps extends ComponentPropsWithoutRef<'div'> {
  variant?: 'default' | 'interactive'
}

export function DarkCard({
  className,
  variant = 'default',
  ...props
}: DarkCardProps) {
  return (
    <div
      className={cn(
        'rounded-none border border-white/5 bg-[#1a1a1a] transition-colors duration-200 hover:border-white/10',
        variant === 'interactive' &&
          'transition-[transform,border-color] duration-300 hover:-translate-y-1',
        className,
      )}
      {...props}
    />
  )
}
