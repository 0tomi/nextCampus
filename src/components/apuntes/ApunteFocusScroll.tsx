'use client'

import { useEffect, useRef } from 'react'

interface ApunteFocusScrollProps {
  slug: string
  focusedSlug?: string
  className?: string
  /**
   * Clases extra a aplicar cuando este apunte coincide con `focusedSlug`.
   * Útil para reforzar el destino del scroll con un borde sutil.
   */
  focusedClassName?: string
  children: React.ReactNode
}

export function ApunteFocusScroll({
  slug,
  focusedSlug,
  className,
  focusedClassName,
  children,
}: ApunteFocusScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const enfocado = focusedSlug === slug

  useEffect(() => {
    if (!enfocado) return
    const handle = window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(handle)
  }, [enfocado])

  return (
    <div
      ref={ref}
      className={[className ?? '', enfocado ? focusedClassName ?? '' : '']
        .join(' ')
        .trim() || undefined}
    >
      {children}
    </div>
  )
}
