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

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('"fs" no está soportado')
    expect(result.error).toContain('recharts')
  })

  it('externaliza librerías soportadas sin bundlearlas', async () => {
    const result = await compileReactArtifact({
      extension: 'tsx',
      title: 'Gráfico',
      source: `
        import { useState } from 'react'
        import { LineChart, Line, XAxis, YAxis } from 'recharts'

        const data = [{ x: 1, y: 2 }, { x: 2, y: 4 }]

        export default function Grafico() {
          return (
            <LineChart width={400} height={300} data={data}>
              <Line dataKey="y" />
              <XAxis dataKey="x" />
              <YAxis />
            </LineChart>
          )
        }
      `,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // recharts debe quedar como import externo, no bundleado
    expect(result.html).toContain('"recharts"')
    // El import map debe resolver recharts via esm.sh
    expect(result.html).toContain('esm.sh/recharts@2')
  })

  it('incluye import map extendido, KaTeX CSS y Tailwind Browser', async () => {
    const result = await compileReactArtifact({
      extension: 'tsx',
      title: 'Test',
      source: `
        export default function Test() {
          return <p>test</p>
        }
      `,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Import map con todas las librerías soportadas
    expect(result.html).toContain('esm.sh/recharts')
    expect(result.html).toContain('esm.sh/lucide-react')
    expect(result.html).toContain('esm.sh/framer-motion')
    expect(result.html).toContain('esm.sh/katex')
    expect(result.html).toContain('esm.sh/d3')
    expect(result.html).toContain('esm.sh/mathjs')

    // KaTeX CSS pre-cargado
    expect(result.html).toContain('katex.min.css')

    // Tailwind Browser v4
    expect(result.html).toContain('@tailwindcss/browser@4')
  })
})
