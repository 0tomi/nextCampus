import { describe, expect, it } from 'vitest'
import { inferirCategoriasDeApunte, inferirCategoriasDeRecurso } from './apunte-categorias'

describe('inferirCategoriasDeRecurso', () => {
  it('marca los apuntes interactivos', () => {
    expect(inferirCategoriasDeRecurso({ tipo: 'HTML' })).toEqual(['Interactivo'])
  })

  it('marca videos de YouTube', () => {
    expect(inferirCategoriasDeRecurso({ tipo: 'YOUTUBE', url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' })).toEqual(['Video'])
  })

  it('marca documentos nativos de Google', () => {
    expect(inferirCategoriasDeRecurso({ tipo: 'DRIVE', url: 'https://docs.google.com/document/d/abc123/edit' })).toEqual(['Documento'])
    expect(inferirCategoriasDeRecurso({ tipo: 'DRIVE', url: 'https://docs.google.com/spreadsheets/d/abc123/edit' })).toEqual(['Documento'])
    expect(inferirCategoriasDeRecurso({ tipo: 'DRIVE', url: 'https://docs.google.com/presentation/d/abc123/edit' })).toEqual(['Documento'])
  })

  it('usa el nombre del recurso para archivos Drive genéricos', () => {
    expect(inferirCategoriasDeRecurso({ tipo: 'DRIVE', url: 'https://drive.google.com/file/d/abc123/view', nombre: 'resumen.pdf' })).toEqual(['Documento'])
    expect(inferirCategoriasDeRecurso({ tipo: 'DRIVE', url: 'https://drive.google.com/file/d/abc123/view', nombre: 'diagrama.png' })).toEqual(['Imágenes'])
  })

  it('no inventa categoría para Drive genérico sin datos claros', () => {
    expect(inferirCategoriasDeRecurso({ tipo: 'DRIVE', url: 'https://drive.google.com/file/d/abc123/view', nombre: 'material' })).toEqual([])
  })
})

describe('inferirCategoriasDeApunte', () => {
  it('combina categorías y usa Otro como fallback', () => {
    expect(inferirCategoriasDeApunte([
      { tipo: 'YOUTUBE' },
      { tipo: 'HTML' },
      { tipo: 'DRIVE', url: 'https://drive.google.com/file/d/abc123/view', nombre: 'foto.jpg' },
    ])).toEqual(['Video', 'Interactivo', 'Imágenes'])

    expect(inferirCategoriasDeApunte([])).toEqual(['Otro'])
  })
})
