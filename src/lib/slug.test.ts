import { describe, it, expect } from 'vitest'
import { slugify, ensureUniqueSlug } from './slug'

describe('slugify', () => {
  it('lowercase + reemplaza espacios por guiones', () => {
    expect(slugify('Hola Mundo')).toBe('hola-mundo')
  })

  it('elimina diacríticos (acentos, tildes, eñe)', () => {
    expect(slugify('Programación Avanzada')).toBe('programacion-avanzada')
    expect(slugify('Año Nuevo')).toBe('ano-nuevo')
    expect(slugify('Niño feliz')).toBe('nino-feliz')
  })

  it('colapsa múltiples separadores y limpia guiones de borde', () => {
    expect(slugify('  ---hola___mundo!!!  ')).toBe('hola-mundo')
  })

  it('reemplaza signos de puntuación', () => {
    expect(slugify('¿Qué onda, che?')).toBe('que-onda-che')
  })

  it('devuelve "apunte" cuando el resultado queda vacío', () => {
    expect(slugify('')).toBe('apunte')
    expect(slugify('!!!---???')).toBe('apunte')
    expect(slugify('   ')).toBe('apunte')
  })

  it('trunca a 80 caracteres como máximo', () => {
    const largo = 'a'.repeat(200)
    expect(slugify(largo).length).toBeLessThanOrEqual(80)
  })

  it('no deja guion final luego del truncado', () => {
    // Genera "abc-abc-abc-..." y verifica que no termine en "-"
    const input = ('abc '.repeat(50)).trim()
    const out = slugify(input)
    expect(out.endsWith('-')).toBe(false)
    expect(out.length).toBeLessThanOrEqual(80)
  })
})

describe('ensureUniqueSlug', () => {
  it('devuelve el base si no colisiona', () => {
    const taken = new Set<string>(['otro-slug'])
    expect(ensureUniqueSlug('mi-slug', taken)).toBe('mi-slug')
  })

  it('agrega -2 si el base colisiona', () => {
    const taken = new Set<string>(['mi-slug'])
    expect(ensureUniqueSlug('mi-slug', taken)).toBe('mi-slug-2')
  })

  it('sube el sufijo hasta encontrar uno libre', () => {
    const taken = new Set<string>(['mi-slug', 'mi-slug-2', 'mi-slug-3'])
    expect(ensureUniqueSlug('mi-slug', taken)).toBe('mi-slug-4')
  })

  it('funciona con ReadonlySet vacío', () => {
    const taken: ReadonlySet<string> = new Set<string>()
    expect(ensureUniqueSlug('mi-slug', taken)).toBe('mi-slug')
  })
})
