import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ApunteSearchPanel, type ApunteSearchViewModel } from './ApunteSearchResults'
import { groupApunteSearchItems } from './ApunteSearchResults.utils'

function makeItem(overrides: Partial<ApunteSearchViewModel['items'][number]> = {}): ApunteSearchViewModel['items'][number] {
  return {
    id: 'apunte-1',
    title: 'Resumen Primer Parcial',
    slug: 'resumen-primer-parcial',
    href: '/segundo-anio/algoritmos/apuntes/resumen-primer-parcial',
    excerpt: 'Material para repasar antes del examen.',
    categories: ['Resumen'],
    resourceTypes: ['DRIVE'],
    subject: { name: 'Algoritmos', slug: 'algoritmos' },
    year: { name: 'Segundo año', slug: 'segundo-anio' },
    ...overrides,
  }
}

describe('ApunteSearchResults', () => {
  it('agrupa preservando el orden de relevancia del primer resultado de cada grupo', () => {
    const groups = groupApunteSearchItems([
      makeItem({ id: 'a', subject: { name: 'Bases', slug: 'bases' }, year: { name: 'Cuarto año', slug: 'cuarto-anio' } }),
      makeItem({ id: 'b', subject: { name: 'Algoritmos', slug: 'algoritmos' }, year: { name: 'Segundo año', slug: 'segundo-anio' } }),
      makeItem({ id: 'c', subject: { name: 'Bases', slug: 'bases' }, year: { name: 'Cuarto año', slug: 'cuarto-anio' } }),
    ])

    expect(groups.map((group) => group.key)).toEqual([
      'cuarto-anio:bases',
      'segundo-anio:algoritmos',
    ])
    expect(groups[0].items.map((item) => item.id)).toEqual(['a', 'c'])
  })

  it('renderiza estados amigables y tarjetas clickeables', () => {
    const markup = renderToStaticMarkup(
      <ApunteSearchPanel model={{ query: 'parcial', status: 'results', items: [makeItem()] }} />,
    )

    expect(markup).toContain('1 resultado para')
    expect(markup).toContain('Resumen Primer Parcial')
    expect(markup).toContain('Abrir apunte')
    expect(markup).toContain('/segundo-anio/algoritmos/apuntes/resumen-primer-parcial')
    expect(markup).toContain('Drive')
  })

  it('pide al menos 2 caracteres sin mencionar detalles técnicos', () => {
    const markup = renderToStaticMarkup(
      <ApunteSearchPanel model={{ query: 'a', status: 'too-short', items: [] }} />,
    )

    expect(markup).toContain('Escribí al menos 2 caracteres.')
    expect(markup).not.toContain('FTS')
    expect(markup).not.toContain('query')
  })
})
