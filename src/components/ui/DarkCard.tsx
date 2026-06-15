import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '@/lib/utils'

interface DarkCardProps extends ComponentPropsWithoutRef<'div'> {
  variant?: 'default' | 'interactive'
  ref?: Ref<HTMLDivElement>
}

export function DarkCard({
  className,
  variant = 'default',
  ref,
  ...props
}: DarkCardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-none border border-white/5 bg-surface-1 transition-colors duration-200 hover:border-white/10',
        variant === 'interactive' &&
          'transition-[transform,border-color] duration-300 hover:-translate-y-1',
        className,
      )}
      {...props}
    />
  )
}
