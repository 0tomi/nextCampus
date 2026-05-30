import { build, type Plugin } from 'esbuild'
import { createRequire } from 'node:module'

export const MAX_APUNTE_REACT_SOURCE_BYTES = 500 * 1024
export const APUNTE_ARTIFACT_HTML_MIME = 'text/html; charset=utf-8'

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
  const esmRequire = createRequire(import.meta.url)

  return {
    name: 'nextcampus-react-artifact',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^\.\/artifact$/ }, () => ({
        path: artifactPath,
        namespace: 'nextcampus-artifact',
      }))
      // Resolver react/react-dom desde CUALQUIER namespace usando paths absolutos.
      // En producción (Vercel standalone) process.cwd() no tiene node_modules con
      // React; require.resolve() usa el algoritmo de Node que sí los encuentra.
      pluginBuild.onResolve({ filter: ARTIFACT_BUNDLER_IMPORT_RE }, (args) => {
        try {
          return { path: esmRequire.resolve(args.path) }
        } catch {
          return undefined
        }
      })
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
      format: 'iife',
      stdin: {
        contents: `
          import React from 'react'
          import { createRoot } from 'react-dom/client'
          import Artifact from './artifact'

          const root = document.getElementById('root')
          if (!root) throw new Error('No se encontró el contenedor del apunte.')

          createRoot(root).render(React.createElement(Artifact))
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
  <style>
    :root { color-scheme: light dark; }
    html, body, #root { min-height: 100%; margin: 0; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>${escapeInlineScript(script)}</script>
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
