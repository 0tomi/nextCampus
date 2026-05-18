'use client'

import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AnimateInProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode
  delay?: number
}

export function AnimateIn({
  children,
  delay = 0,
  className,
  style,
  ...props
}: AnimateInProps) {
  const animationStyle: CSSProperties = delay
    ? { ...style, animationDelay: `${delay}ms` }
    : (style ?? {})

  return (
    <div
      className={cn('animate-in', className)}
      style={animationStyle}
      {...props}
    >
      {children}
    </div>
  )
}
