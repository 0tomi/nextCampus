import { describe, expect, it } from 'vitest'
import { getEventTone } from './eventTones'

describe('getEventTone', () => {
  it.each(['Examen', 'Parcial', 'Final', 'Recuperatorio', 'examen'])(
    'classifies %s as an exam',
    (tipo) => {
      expect(getEventTone(tipo)).toBe('red')
    },
  )

  it.each(['Trabajo Práctico', 'trabajo practico', 'trabajo-practico', 'TP', 'Entrega'])(
    'classifies %s as an assignment',
    (tipo) => {
      expect(getEventTone(tipo)).toBe('yellow')
    },
  )

  it.each(['Exposición', 'exposicion', 'Clase', 'Coloquio'])(
    'classifies %s with the default tone',
    (tipo) => {
      expect(getEventTone(tipo)).toBe('emerald')
    },
  )

  it.each([null, undefined, '', '   '])('returns null for an empty type (%s)', (tipo) => {
    expect(getEventTone(tipo)).toBeNull()
  })
})
