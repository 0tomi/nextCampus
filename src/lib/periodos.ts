// Metadatos client-safe de los períodos académicos.
// Soporta la definición dinámica de categorías provista desde la base de datos.

export const PERIODO_TONES = ['sky', 'yellow', 'emerald', 'rose', 'violet', 'orange'] as const
export type PeriodoTone = (typeof PERIODO_TONES)[number]

export interface CategoriaPeriodoDto {
  id: string
  label: string
  tone: PeriodoTone
}

export function isPeriodoTone(value: unknown): value is PeriodoTone {
  return typeof value === 'string' && (PERIODO_TONES as readonly string[]).includes(value)
}

// Color de fondo (rgba) por tono. Una sola fuente para FullCalendar y mobile.
export const PERIODO_TONE_BG: Record<PeriodoTone, string> = {
  sky: 'rgba(56, 189, 248, 0.18)',
  yellow: 'rgba(234, 179, 8, 0.18)',
  emerald: 'rgba(16, 185, 129, 0.18)',
  rose: 'rgba(244, 63, 94, 0.18)',
  violet: 'rgba(139, 92, 246, 0.18)',
  orange: 'rgba(249, 115, 22, 0.18)',
}

/// Período serializado para el cliente: fechas como "YYYY-MM-DD".
export interface PeriodoCalendario {
  id: string
  categoriaId: string
  categoria: CategoriaPeriodoDto
  titulo: string
  fechaInicio: string
  fechaFin: string
}

