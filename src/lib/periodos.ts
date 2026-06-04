// Metadatos client-safe de los períodos académicos.
// Espeja el enum CategoriaPeriodo de Prisma (no lo importa, para poder usarse
// en componentes 'use client' sin arrastrar el cliente de Prisma).

export const CATEGORIAS_PERIODO = ['SUSPENSION_CLASES', 'MESAS_EXAMEN'] as const

export type CategoriaPeriodo = (typeof CATEGORIAS_PERIODO)[number]

export interface PeriodoMeta {
  /// Texto user-friendly para mostrar en la UI y la leyenda.
  label: string
  /// Tono de color (mapea a las clases .fc-bg-tone-{tone} y a los estilos mobile).
  tone: 'sky' | 'yellow'
}

export const PERIODO_META: Record<CategoriaPeriodo, PeriodoMeta> = {
  SUSPENSION_CLASES: { label: 'Suspensión de clases', tone: 'sky' },
  MESAS_EXAMEN: { label: 'Mesas de examen', tone: 'yellow' },
}

export function getPeriodoMeta(categoria: CategoriaPeriodo): PeriodoMeta {
  return PERIODO_META[categoria]
}

// Color de fondo (rgba) por tono. Una sola fuente para FullCalendar y mobile.
export const PERIODO_TONE_BG: Record<PeriodoMeta['tone'], string> = {
  sky: 'rgba(56, 189, 248, 0.18)',
  yellow: 'rgba(234, 179, 8, 0.18)',
}

/// Período serializado para el cliente: fechas como "YYYY-MM-DD".
export interface PeriodoCalendario {
  id: string
  categoria: CategoriaPeriodo
  titulo: string
  fechaInicio: string
  fechaFin: string
}
