import { describe, it, expect } from 'vitest'
import { sanitizeRichHtml } from './sanitize'

describe('sanitizeRichHtml — eliminación de tags peligrosos', () => {
  it('elimina <script>', () => {
    const result = sanitizeRichHtml('<script>alert(1)</script>')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('alert')
  })

  it('elimina <img> con onerror', () => {
    const result = sanitizeRichHtml('<img src=x onerror=alert(1)>')
    expect(result).not.toContain('<img')
    expect(result).not.toContain('onerror')
  })

  it('elimina <iframe>', () => {
    const result = sanitizeRichHtml('<iframe src="https://evil.com"></iframe>')
    expect(result).not.toContain('<iframe')
    expect(result).not.toContain('evil.com')
  })

  it('elimina <object>', () => {
    const result = sanitizeRichHtml('<object data="https://evil.com/x.swf"></object>')
    expect(result).not.toContain('<object')
  })

  it('elimina <embed>', () => {
    const result = sanitizeRichHtml('<embed src="https://evil.com/x.swf">')
    expect(result).not.toContain('<embed')
  })

  it('elimina <svg>', () => {
    const result = sanitizeRichHtml('<svg><script>alert(1)</script></svg>')
    expect(result).not.toContain('<svg')
    expect(result).not.toContain('<script')
  })

  it('elimina <form> e <input>', () => {
    const result = sanitizeRichHtml('<form action="https://evil.com"><input type="text"></form>')
    expect(result).not.toContain('<form')
    expect(result).not.toContain('<input')
  })
})

describe('sanitizeRichHtml — filtrado de href peligrosos', () => {
  it('elimina href javascript:', () => {
    const result = sanitizeRichHtml('<a href="javascript:alert(1)">click</a>')
    expect(result).not.toContain('javascript:')
    // El enlace puede quedar sin href o sin el tag, pero nunca con javascript:
    if (result.includes('<a')) {
      expect(result).not.toContain('href="javascript:')
    }
  })

  it('elimina href data:', () => {
    const result = sanitizeRichHtml('<a href="data:text/html,<script>alert(1)</script>">click</a>')
    expect(result).not.toContain('data:')
  })

  it('elimina href vbscript:', () => {
    const result = sanitizeRichHtml('<a href="vbscript:msgbox(1)">click</a>')
    expect(result).not.toContain('vbscript:')
  })
})

describe('sanitizeRichHtml — links seguros', () => {
  it('conserva href https: CON rel y target forzados', () => {
    const result = sanitizeRichHtml('<a href="https://example.com">ok</a>')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('rel="noopener noreferrer nofollow"')
    expect(result).toContain('target="_blank"')
  })

  it('conserva href mailto:', () => {
    const result = sanitizeRichHtml('<a href="mailto:foo@bar.com">mail</a>')
    expect(result).toContain('href="mailto:foo@bar.com"')
    expect(result).toContain('rel="noopener noreferrer nofollow"')
  })

  it('no aplica rel/target a elementos que no son <a>', () => {
    const result = sanitizeRichHtml('<p>texto <strong>fuerte</strong></p>')
    expect(result).toContain('<p>')
    expect(result).toContain('<strong>fuerte</strong>')
    expect(result).not.toContain('rel=')
    expect(result).not.toContain('target=')
  })
})

describe('sanitizeRichHtml — contenido formateado permitido', () => {
  it('pasa párrafo con negrita intacto', () => {
    const result = sanitizeRichHtml('<p>texto <strong>fuerte</strong></p>')
    expect(result).toContain('<p>')
    expect(result).toContain('<strong>fuerte</strong>')
  })

  it('pasa listas sin modificar', () => {
    const html = '<ul><li>primero</li><li>segundo</li></ul>'
    const result = sanitizeRichHtml(html)
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>primero</li>')
  })

  it('pasa headings h2, h3, h4', () => {
    const result = sanitizeRichHtml('<h2>Título</h2><h3>Sub</h3><h4>Sub2</h4>')
    expect(result).toContain('<h2>')
    expect(result).toContain('<h3>')
    expect(result).toContain('<h4>')
  })

  it('pasa blockquote y code', () => {
    const result = sanitizeRichHtml('<blockquote><code>const x = 1</code></blockquote>')
    expect(result).toContain('<blockquote>')
    expect(result).toContain('<code>')
  })
})
