'use client'

import { useCallback, useReducer } from 'react'
import {
  INTERACTIVE_NOTE_FILE_RE,
  makeRecursoDraft,
  type RecursoDraft,
  type RecursoDraftKind,
} from '@/lib/domain/apuntes/apunteForm'
import { isValidHttpsUrl, detectarRecurso, type RecursoTipo } from '@/lib/recursos'

type InitialRecurso = {
  tipo: RecursoTipo
  url: string
  nombre?: string | null
  storageKey?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
}

type RecursosAction =
  | { type: 'add' }
  | { type: 'kind-change'; localId: string; kind: RecursoDraftKind }
  | { type: 'remove'; localId: string }
  | { type: 'move-up'; index: number }
  | { type: 'move-down'; index: number }
  | { type: 'url-change'; localId: string; value: string }
  | { type: 'nombre-change'; localId: string; value: string }
  | { type: 'html-file-change'; localId: string; file: File | null }
  | { type: 'start-html-replace'; localId: string }
  | { type: 'cancel-html-replace'; localId: string }
  | { type: 'url-blur'; localId: string; value: string }

/** Tipo de un recurso de tipo Link según su URL (detección + fallback a enlace externo). */
function resolveLinkTipo(url: string): RecursoTipo | null {
  const detected = detectarRecurso(url)
  if (detected) return detected.tipo
  return isValidHttpsUrl(url) ? 'OTHER' : null
}

function makeInitialRecursos(initialRecursos: InitialRecurso[]): RecursoDraft[] {
  return initialRecursos.map((recurso) =>
    makeRecursoDraft(recurso.url, recurso.tipo, recurso.nombre ?? '', {
      storageKey: recurso.storageKey,
      mimeType: recurso.mimeType,
      sizeBytes: recurso.sizeBytes,
      replacingStorage: false,
    }),
  )
}

function recursosReducer(recursos: RecursoDraft[], action: RecursosAction): RecursoDraft[] {
  switch (action.type) {
    case 'add':
      return [...recursos, makeRecursoDraft('', null)]

    case 'kind-change':
      return recursos.map((recurso) => {
        if (recurso.localId !== action.localId) return recurso
        const tipo = action.kind === 'HTML' ? 'HTML' : resolveLinkTipo(recurso.url)
        return { ...recurso, kind: action.kind, tipo, error: undefined }
      })

    case 'remove':
      return recursos.filter((recurso) => recurso.localId !== action.localId)

    case 'move-up': {
      if (action.index === 0) return recursos
      const next = [...recursos]
      ;[next[action.index - 1], next[action.index]] = [next[action.index], next[action.index - 1]]
      return next
    }

    case 'move-down': {
      if (action.index === recursos.length - 1) return recursos
      const next = [...recursos]
      ;[next[action.index], next[action.index + 1]] = [next[action.index + 1], next[action.index]]
      return next
    }

    case 'url-change':
      return recursos.map((recurso) =>
        recurso.localId === action.localId
          ? { ...recurso, url: action.value, tipo: null, error: undefined }
          : recurso,
      )

    case 'nombre-change':
      return recursos.map((recurso) =>
        recurso.localId === action.localId ? { ...recurso, nombre: action.value } : recurso,
      )

    case 'html-file-change':
      return recursos.map((recurso) => {
        if (recurso.localId !== action.localId) return recurso
        if (!action.file) return { ...recurso, fileName: undefined, tipo: 'HTML', error: undefined }

        const isInteractiveNote = INTERACTIVE_NOTE_FILE_RE.test(action.file.name)
        return {
          ...recurso,
          tipo: 'HTML',
          fileName: action.file.name,
          error: isInteractiveNote ? undefined : 'Subí un archivo HTML, JSX o TSX',
        }
      })

    case 'start-html-replace':
      return recursos.map((recurso) =>
        recurso.localId === action.localId
          ? { ...recurso, replacingStorage: true, fileName: undefined, error: undefined }
          : recurso,
      )

    case 'cancel-html-replace':
      return recursos.map((recurso) =>
        recurso.localId === action.localId
          ? { ...recurso, replacingStorage: false, fileName: undefined, error: undefined }
          : recurso,
      )

    case 'url-blur': {
      if (!action.value.trim()) {
        return recursos.map((recurso) =>
          recurso.localId === action.localId ? { ...recurso, tipo: null, error: undefined } : recurso,
        )
      }

      return recursos.map((recurso) => {
        if (recurso.localId !== action.localId) return recurso
        const tipo = resolveLinkTipo(action.value)
        return {
          ...recurso,
          tipo,
          error: tipo ? undefined : 'Ingresá una URL válida (debe empezar con https://)',
        }
      })
    }
  }
}

/**
 * Estado interdependiente de la lista de recursos del apunte, consolidado en un
 * `useReducer`: cada operación (agregar, reordenar, cambiar tipo/URL/archivo) es
 * una transición atómica sobre el mismo arreglo.
 */
export function useApunteRecursos(initialRecursos: InitialRecurso[] = []) {
  const [recursos, dispatch] = useReducer(recursosReducer, initialRecursos, makeInitialRecursos)

  const addRecurso = useCallback(() => dispatch({ type: 'add' }), [])
  const handleKindChange = useCallback(
    (localId: string, kind: RecursoDraftKind) => dispatch({ type: 'kind-change', localId, kind }),
    [],
  )
  const removeRecurso = useCallback((localId: string) => dispatch({ type: 'remove', localId }), [])
  const moveUp = useCallback((index: number) => dispatch({ type: 'move-up', index }), [])
  const moveDown = useCallback((index: number) => dispatch({ type: 'move-down', index }), [])
  const handleUrlChange = useCallback(
    (localId: string, value: string) => dispatch({ type: 'url-change', localId, value }),
    [],
  )
  const handleNombreChange = useCallback(
    (localId: string, value: string) => dispatch({ type: 'nombre-change', localId, value }),
    [],
  )
  const handleHtmlFileChange = useCallback(
    (localId: string, file: File | null) => dispatch({ type: 'html-file-change', localId, file }),
    [],
  )
  const startHtmlReplace = useCallback((localId: string) => dispatch({ type: 'start-html-replace', localId }), [])
  const cancelHtmlReplace = useCallback((localId: string) => dispatch({ type: 'cancel-html-replace', localId }), [])
  const handleUrlBlur = useCallback(
    (localId: string, value: string) => dispatch({ type: 'url-blur', localId, value }),
    [],
  )

  return {
    recursos,
    addRecurso,
    cancelHtmlReplace,
    handleHtmlFileChange,
    handleKindChange,
    handleNombreChange,
    handleUrlBlur,
    handleUrlChange,
    moveDown,
    moveUp,
    removeRecurso,
    startHtmlReplace,
  }
}
