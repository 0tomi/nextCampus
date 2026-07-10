import type { RecursoViewVariant } from './types'

/**
 * Resuelve, a partir del `variant` de la vista, los tokens de estilo que
 * comparten varias piezas de recurso. Centraliza la lógica para que cada
 * componente de recurso reciba clases ya resueltas en vez de repetir el
 * mismo condicional sobre `variant`.
 */
export function variantCardClasses(variant: RecursoViewVariant) {
  return {
    fillHeight: variant === 'content-card' ? 'h-full' : '',
    showTitle: variant !== 'wide',
  }
}

export function driveFrameClasses(variant: RecursoViewVariant) {
  return {
    rounded: variant === 'wide' ? 'rounded-xl' : 'rounded-md',
    border: variant === 'wide' ? 'border border-white/5' : 'border border-white/10',
  }
}
