import { detectarRecurso, type RecursoTipo } from '@/lib/recursos'

export type RecursoDraftKind = 'LINK' | 'HTML'

export interface RecursoDraft {
  /** Local key — nunca se manda al server */
  localId: string
  kind: RecursoDraftKind
  url: string
  tipo: RecursoTipo | null
  nombre: string
  storageKey?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  fileName?: string
  replacingStorage?: boolean
  error?: string
}

/** Forma serializada que viaja en el input oculto recursosJson. */
type SerializedRecurso =
  | {
      tipo: 'HTML'
      localId: string
      url: string
      orden: number
      nombre?: string
      storageKey?: string
      mimeType?: string
      sizeBytes?: number
    }
  | {
      tipo: RecursoTipo
      url: string
      orden: number
      nombre?: string
    }

export const INTERACTIVE_NOTE_FILE_RE = /\.(html?|jsx|tsx)$/i

export function makeRecursoDraft(
  url: string,
  tipo: RecursoTipo | null,
  nombre: string = '',
  extra?: Partial<RecursoDraft>,
): RecursoDraft {
  return {
    localId: crypto.randomUUID(),
    kind: tipo === 'HTML' ? 'HTML' : 'LINK',
    url,
    tipo,
    nombre,
    ...extra,
  }
}

export function detectRecursoTipo(url: string): RecursoTipo | null {
  if (!url.trim()) return null
  return detectarRecurso(url)?.tipo ?? null
}

export function serializeRecursos(recursos: RecursoDraft[]): string {
  return JSON.stringify(
    recursos.flatMap<SerializedRecurso>((recurso, index) => {
      if (!(recurso.kind === 'HTML' ? recurso.tipo === 'HTML' : recurso.url.trim() && recurso.tipo)) {
        return []
      }

      const nombre = recurso.nombre.trim()
      if (recurso.kind === 'HTML') {
        return [
          {
            tipo: 'HTML',
            localId: recurso.localId,
            url: '',
            orden: index,
            ...(nombre.length > 0 ? { nombre } : {}),
            ...(recurso.storageKey && !recurso.replacingStorage ? { storageKey: recurso.storageKey } : {}),
            ...(recurso.mimeType ? { mimeType: recurso.mimeType } : {}),
            ...(recurso.sizeBytes ? { sizeBytes: recurso.sizeBytes } : {}),
          },
        ]
      }

      if (!recurso.tipo) return []
      return [
        {
          url: recurso.url.trim(),
          tipo: recurso.tipo,
          orden: index,
          ...(nombre.length > 0 ? { nombre } : {}),
        },
      ]
    }),
  )
}

export function getApunteFormValidationError(recursos: RecursoDraft[], categoriaIds: string[]): string {
  const hasInvalidLink = recursos.some((recurso) => recurso.kind === 'LINK' && recurso.url.trim() && !recurso.tipo)
  if (hasInvalidLink) return 'Hay links inválidos. Deben ser URLs válidas (deben empezar con https://).'

  const invalidHtml = recursos.find(
    (recurso) => recurso.kind === 'HTML' && (!recurso.storageKey || recurso.replacingStorage) && !recurso.fileName,
  )
  if (invalidHtml) return 'Seleccioná un archivo para cada apunte interactivo.'

  const htmlWithErrors = recursos.find((recurso) => recurso.kind === 'HTML' && recurso.error)
  if (htmlWithErrors) return 'Revisá los apuntes interactivos antes de guardar.'

  if (categoriaIds.length === 0) return 'Elegí al menos una categoría.'

  return ''
}
