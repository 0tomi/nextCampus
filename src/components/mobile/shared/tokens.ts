export const EVENT_TONES: Record<string, { bg: string; border: string; text: string }> = {
  'Examen':           { bg: 'rgba(239,68,68,0.16)',  border: 'rgba(239,68,68,0.36)',  text: '#fecaca' },
  'Trabajo Práctico': { bg: 'rgba(251,191,36,0.16)', border: 'rgba(251,191,36,0.36)', text: '#fde68a' },
  'Exposición':       { bg: 'rgba(167,139,250,0.16)', border: 'rgba(167,139,250,0.36)', text: '#ddd6fe' },
  'Aviso':            { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.14)', text: '#fff' },
}

export type EventTone = (typeof EVENT_TONES)[keyof typeof EVENT_TONES]

export function getEventTone(tipo: string | null | undefined): EventTone {
  if (!tipo) return EVENT_TONES['Aviso']
  return EVENT_TONES[tipo] ?? EVENT_TONES['Aviso']
}
