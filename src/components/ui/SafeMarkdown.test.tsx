import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SafeMarkdown } from './SafeMarkdown'

describe('SafeMarkdown', () => {
  it('retorna null si el contenido es null, undefined o whitespace', () => {
    expect(renderToStaticMarkup(<SafeMarkdown content={null} />)).toBe('')
    expect(renderToStaticMarkup(<SafeMarkdown content={undefined} />)).toBe('')
    expect(renderToStaticMarkup(<SafeMarkdown content="" />)).toBe('')
    expect(renderToStaticMarkup(<SafeMarkdown content="   " />)).toBe('')
    expect(renderToStaticMarkup(<SafeMarkdown content={'   \n\t\r  '} />)).toBe('')
  })

  it('renderiza negrita, itálica y encabezados correctamente', () => {
    const markdown = `# Título 1
## Título 2
### Título 3
Este texto tiene **negrita** e *itálica*.`

    const markup = renderToStaticMarkup(<SafeMarkdown content={markdown} />)

    expect(markup).toContain('<h1')
    expect(markup).toContain('Título 1</h1>')
    expect(markup).toContain('<h2')
    expect(markup).toContain('Título 2</h2>')
    expect(markup).toContain('<h3')
    expect(markup).toContain('Título 3</h3>')
    expect(markup).toContain('<strong>negrita</strong>')
    expect(markup).toContain('<em>itálica</em>')
  })

  it('renderiza enlaces seguros con target="_blank" y rel="noopener noreferrer nofollow"', () => {
    const markdown = '[Sitio web](https://example.com) y [Ruta relativa](/primer-anio/calculo)'

    const markup = renderToStaticMarkup(<SafeMarkdown content={markdown} />)

    expect(markup).toContain('href="https://example.com"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noopener noreferrer nofollow"')
    expect(markup).toContain('href="/primer-anio/calculo"')
  })

  it('neutraliza/no crea enlaces para URLs peligrosas (javascript:..., data:..., vbscript:...)', () => {
    const markdown = `
[Peligro JS](javascript:alert(1))
[Peligro Data](data:text/html,<script>alert(1)</script>)
[Peligro VBS](vbscript:msgbox(1))
[Peligro JS Mayus](JAVASCRIPT:alert(1))
`

    const markup = renderToStaticMarkup(<SafeMarkdown content={markdown} />)

    expect(markup).not.toContain('href="javascript:')
    expect(markup).not.toContain('href="data:')
    expect(markup).not.toContain('href="vbscript:')
    expect(markup).not.toContain('href="JAVASCRIPT:')
    expect(markup).toContain('<span>Peligro JS</span>')
    expect(markup).toContain('<span>Peligro Data</span>')
    expect(markup).toContain('<span>Peligro VBS</span>')
    expect(markup).toContain('<span>Peligro JS Mayus</span>')
  })

  it('renderiza listas y tablas GFM', () => {
    const markdown = `
- Elemento desordenado 1
- Elemento desordenado 2

1. Elemento ordenado 1
2. Elemento ordenado 2

| Columna A | Columna B |
| --------- | --------- |
| Celda 1   | Celda 2   |

~~Texto tachado~~
`

    const markup = renderToStaticMarkup(<SafeMarkdown content={markdown} />)

    expect(markup).toContain('<ul>')
    expect(markup).toContain('<li>Elemento desordenado 1</li>')
    expect(markup).toContain('<li>Elemento desordenado 2</li>')
    expect(markup).toContain('<ol>')
    expect(markup).toContain('<li>Elemento ordenado 1</li>')
    expect(markup).toContain('<li>Elemento ordenado 2</li>')
    expect(markup).toContain('<table>')
    expect(markup).toContain('<th>Columna A</th>')
    expect(markup).toContain('<th>Columna B</th>')
    expect(markup).toContain('<td>Celda 1</td>')
    expect(markup).toContain('<td>Celda 2</td>')
    expect(markup).toContain('<del>Texto tachado</del>')
  })

  it('aplica clases adicionales si se pasan por className', () => {
    const markup = renderToStaticMarkup(
      <SafeMarkdown content="Texto de prueba" className="custom-markdown-class" />,
    )

    expect(markup).toContain('custom-markdown-class')
  })

  it('renderiza enlaces como span plano cuando stripLinks es true', () => {
    const markdown = 'Visita [mi apunte](https://example.com) para más info'
    const markup = renderToStaticMarkup(
      <SafeMarkdown content={markdown} stripLinks />,
    )

    expect(markup).not.toContain('<a')
    expect(markup).not.toContain('href=')
    expect(markup).toContain('<span>mi apunte</span>')
  })
})
