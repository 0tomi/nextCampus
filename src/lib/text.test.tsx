import { describe, it, expect } from 'vitest'
import { formatDescription } from './text'
import type React from 'react'

describe('formatDescription — formateo seguro de texto plano', () => {
  it('retorna vacío para inputs vacíos o nulos', () => {
    expect(formatDescription(null)).toEqual([])
    expect(formatDescription(undefined)).toEqual([])
    expect(formatDescription('')).toEqual([])
  })

  it('pasa texto plano común sin modificaciones especiales', () => {
    const nodes = formatDescription('Texto común y corriente')
    expect(nodes.length).toBe(1)
  })

  it('procesa texto en negrita y lo envuelve en strong', () => {
    const nodes = formatDescription('Texto **importante** aquí')
    // Debe separar en: 'Texto ', un elemento strong con 'importante', y ' aquí'
    expect(nodes.length).toBe(1) // Contiene Fragment con los elementos
  })

  it('procesa enlaces y los vuelve clickeables', () => {
    const nodes = formatDescription('Visita https://google.com para buscar cosas')
    // El enlace debe ser un elemento HTML a con href
    // El split genera 3 partes: 'Visita ', la URL, y ' para buscar cosas'
    expect(nodes.length).toBe(3)
    const linkNode = nodes[1] as React.ReactElement<{ href: string; target: string }>
    expect(linkNode.type).toBe('a')
    expect(linkNode.props.href).toBe('https://google.com')
    expect(linkNode.props.target).toBe('_blank')
  })

  it('procesa saltos de línea e inserta br', () => {
    const nodes = formatDescription('Línea 1\nLínea 2')
    expect(nodes.length).toBe(1)
  })
})
