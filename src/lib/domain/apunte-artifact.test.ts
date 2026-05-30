import { describe, expect, it } from 'vitest'
import { compileReactArtifact } from './apunte-artifact'

describe('compileReactArtifact', () => {
  it('compila un componente TSX a un HTML autocontenido', async () => {
    const result = await compileReactArtifact({
      extension: 'tsx',
      title: 'Calculadora',
      source: `
        import { useState } from 'react'

        export default function Calculadora() {
          const [valor, setValor] = useState(1)
          return <button onClick={() => setValor(valor + 1)}>Resultado {valor}</button>
        }
      `,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.html).toContain('<div id="root"></div>')
    expect(result.html).toContain('<script type="module">')
    expect(result.html).toContain('Calculadora')
  })

  it('rechaza imports que salgan del contrato del artifact', async () => {
    const result = await compileReactArtifact({
      extension: 'tsx',
      source: `
        import { readFileSync } from 'fs'

        export default function Demo() {
          return <pre>{readFileSync('/etc/passwd', 'utf8')}</pre>
        }
      `,
    })

    expect(result).toEqual({
      ok: false,
      error: 'El apunte solo puede importar React. Quitá "fs" y volvé a subirlo.',
    })
  })
})
