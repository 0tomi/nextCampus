import { describe, expect, it } from 'vitest'
import type { ApunteSearchItem } from '@/lib/domain/apunte-search'
import { groupApunteSearchItems } from './apunte-search-groups'

function makeItem(overrides: Partial<ApunteSearchItem> = {}): ApunteSearchItem {
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

describe('groupApunteSearchItems', () => {
  it('agrupa preservando el orden de relevancia del primer resultado de cada grupo', () => {
    const groups = groupApunteSearchItems([
      makeItem({
        id: 'a',
        subject: { name: 'Bases', slug: 'bases' },
        year: { name: 'Cuarto año', slug: 'cuarto-anio' },
      }),
      makeItem({
        id: 'b',
        subject: { name: 'Algoritmos', slug: 'algoritmos' },
        year: { name: 'Segundo año', slug: 'segundo-anio' },
      }),
      makeItem({
        id: 'c',
        subject: { name: 'Bases', slug: 'bases' },
        year: { name: 'Cuarto año', slug: 'cuarto-anio' },
      }),
    ])

    expect(groups.map((group) => group.key)).toEqual([
      'cuarto-anio:bases',
      'segundo-anio:algoritmos',
    ])
    expect(groups[0].items.map((item) => item.id)).toEqual(['a', 'c'])
  })
})
