import { build, type Plugin } from 'esbuild'

export const MAX_APUNTE_REACT_SOURCE_BYTES = 500 * 1024

const ALLOWED_IMPORTS = new Set(['react'])
const ARTIFACT_BUNDLER_IMPORT_RE = /^(react|react-dom\/client|react\/jsx-runtime)$/
const IMPORT_RE = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g
const DYNAMIC_IMPORT_RE = /\bimport\s*\(/
const REQUIRE_RE = /\brequire\s*\(/

export type ReactArtifactExtension = 'jsx' | 'tsx'

export type CompileReactArtifactResult =
  | { ok: true; html: string; sizeBytes: number }
  | { ok: false; error: string }

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeInlineScript(value: string): string {
  return value.replace(/<\/script/gi, '<\\/script')
}

function validateImports(source: string): string | null {
  if (DYNAMIC_IMPORT_RE.test(source) || REQUIRE_RE.test(source)) {
    return 'El apunte no puede usar imports dinámicos ni require().'
  }

  for (const match of source.matchAll(IMPORT_RE)) {
    const specifier = match[1]
    if (!ALLOWED_IMPORTS.has(specifier)) {
      return `El apunte solo puede importar React. Quitá "${specifier}" y volvé a subirlo.`
    }
  }

  return null
}

function reactArtifactPlugin(source: string, extension: ReactArtifactExtension): Plugin {
  const artifactPath = `nextcampus:artifact.${extension}`

  return {
    name: 'nextcampus-react-artifact',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^\.\/artifact$/ }, () => ({
        path: artifactPath,
        namespace: 'nextcampus-artifact',
      }))
      // Externalizar React: no se bundlea en el artifact. Se carga desde CDN
      // via import map en el HTML generado. Esto evita que esbuild necesite
      // los source files de react en disco (no existen en Vercel standalone).
      pluginBuild.onResolve({ filter: ARTIFACT_BUNDLER_IMPORT_RE }, (args) => ({
        path: args.path,
        external: true,
      }))
      pluginBuild.onLoad(
        { filter: /^nextcampus:artifact\.(jsx|tsx)$/, namespace: 'nextcampus-artifact' },
        () => ({
          loader: extension,
          contents: source,
        }),
      )
    },
  }
}

export async function compileReactArtifact(params: {
  source: string
  extension: ReactArtifactExtension
  title?: string | null
}): Promise<CompileReactArtifactResult> {
  const sourceBytes = Buffer.byteLength(params.source, 'utf8')
  if (sourceBytes > MAX_APUNTE_REACT_SOURCE_BYTES) {
    return { ok: false, error: 'El archivo React no puede superar los 500 KB.' }
  }

  const importError = validateImports(params.source)
  if (importError) return { ok: false, error: importError }

  try {
    const result = await build({
      bundle: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      format: 'esm',
      stdin: {
        contents: `
          import React from 'react'
          import { createRoot } from 'react-dom/client'
          import Artifact from './artifact'

          function ErrorFallback({ message }: { message: string }) {
            return (
              <div style={{ maxWidth: 640, margin: '40px auto', padding: 24, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: 15, margin: '0 0 8px' }}>
                  ⚠️ Este apunte tiene un error
                </p>
                <p style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>
                  Pasale el siguiente mensaje de error a quien lo creó para que lo corrija:
                </p>
                <pre style={{
                  background: '#18181b', color: '#fca5a5', border: '1px solid #27272a',
                  borderRadius: 8, padding: 16, fontSize: 12, overflowX: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                }}>
                  {message}
                </pre>
              </div>
            )
          }

          class ErrorBoundary extends React.Component<
            { children: React.ReactNode },
            { error: string | null }
          > {
            state = { error: null as string | null }
            static getDerivedStateFromError(err: Error) {
              return { error: err.message }
            }
            render() {
              if (this.state.error) return <ErrorFallback message={this.state.error} />
              return this.props.children
            }
          }

          const rootEl = document.getElementById('root')
          if (!rootEl) throw new Error('No se encontró el contenedor del apunte.')

          const reactRoot = createRoot(rootEl)

          window.addEventListener('error', (e) => {
            reactRoot.render(<ErrorFallback message={e.message || String(e)} />)
          })
          window.addEventListener('unhandledrejection', (e) => {
            const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
            reactRoot.render(<ErrorFallback message={msg} />)
          })

          reactRoot.render(
            <ErrorBoundary>
              <Artifact />
            </ErrorBoundary>
          )
        `,
        loader: 'tsx',
        sourcefile: 'nextcampus-entry.tsx',
      },
      jsx: 'automatic',
      legalComments: 'none',
      logLevel: 'silent',
      minify: true,
      platform: 'browser',
      plugins: [reactArtifactPlugin(params.source, params.extension)],
      target: ['es2020'],
      write: false,
    })

    const script = result.outputFiles[0]?.text
    if (!script) {
      return { ok: false, error: 'No se pudo preparar el apunte interactivo.' }
    }

    const title = escapeHtmlText(params.title?.trim() || 'Apunte interactivo')
    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime",
      "react-dom/client": "https://esm.sh/react-dom@19/client"
    }
  }
  </script>
  <style>
    :root { color-scheme: light dark; }
    html, body, #root { min-height: 100%; margin: 0; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">${escapeInlineScript(script)}</script>
</body>
</html>`

    return { ok: true, html, sizeBytes: Buffer.byteLength(html, 'utf8') }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo compilar el apunte.'
    return {
      ok: false,
      error: `No pudimos preparar el apunte React. Revisá el archivo y volvé a intentarlo. ${message}`,
    }
  }
}
