'use client'

import { useCallback, useState } from 'react'
import {
  detectRecursoTipo,
  INTERACTIVE_NOTE_FILE_RE,
  makeRecursoDraft,
  type RecursoDraft,
  type RecursoDraftKind,
} from '@/lib/domain/apuntes/apunteForm'
import { isValidHttpsUrl, detectarRecurso } from '@/lib/recursos'

type InitialRecurso = {
  tipo: 'YOUTUBE' | 'DRIVE' | 'HTML' | 'REPOSITORY' | 'OTHER'
  url: string
  nombre?: string | null
  storageKey?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
}


export function useApunteRecursos(initialRecursos: InitialRecurso[] = []) {
  const [recursos, setRecursos] = useState<RecursoDraft[]>(() =>
    initialRecursos.map((recurso) =>
      makeRecursoDraft(recurso.url, recurso.tipo, recurso.nombre ?? '', {
        storageKey: recurso.storageKey,
        mimeType: recurso.mimeType,
        sizeBytes: recurso.sizeBytes,
        replacingStorage: false,
      }),
    ),
  )

  const addRecurso = useCallback(() => {
    setRecursos((prev) => [...prev, makeRecursoDraft('', null)])
  }, [])

  const handleKindChange = useCallback((localId: string, kind: RecursoDraftKind) => {
    setRecursos((prev) =>
      prev.map((recurso) => {
        if (recurso.localId !== localId) return recurso

        let tipo: 'YOUTUBE' | 'DRIVE' | 'HTML' | 'REPOSITORY' | 'OTHER' | null = null
        if (kind === 'HTML') {
          tipo = 'HTML'
        } else {
          const detected = detectarRecurso(recurso.url)
          if (detected) {
            tipo = detected.tipo
          } else {
            tipo = isValidHttpsUrl(recurso.url) ? 'OTHER' : null
          }
        }

        return {
          ...recurso,
          kind,
          tipo,
          error: undefined,
        }
      }),
    )
  }, [])

  const removeRecurso = useCallback((localId: string) => {
    setRecursos((prev) => prev.filter((recurso) => recurso.localId !== localId))
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index === 0) return
    setRecursos((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])

  const moveDown = useCallback((index: number) => {
    setRecursos((prev) => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])

  const handleUrlChange = useCallback((localId: string, value: string) => {
    setRecursos((prev) =>
      prev.map((recurso) =>
        recurso.localId === localId ? { ...recurso, url: value, tipo: null, error: undefined } : recurso,
      ),
    )
  }, [])

  const handleNombreChange = useCallback((localId: string, value: string) => {
    setRecursos((prev) =>
      prev.map((recurso) => (recurso.localId === localId ? { ...recurso, nombre: value } : recurso)),
    )
  }, [])

  const handleHtmlFileChange = useCallback((localId: string, file: File | null) => {
    setRecursos((prev) =>
      prev.map((recurso) => {
        if (recurso.localId !== localId) return recurso
        if (!file) return { ...recurso, fileName: undefined, tipo: 'HTML', error: undefined }

        const isInteractiveNote = INTERACTIVE_NOTE_FILE_RE.test(file.name)
        return {
          ...recurso,
          tipo: 'HTML',
          fileName: file.name,
          error: isInteractiveNote ? undefined : 'Subí un archivo HTML, JSX o TSX',
        }
      }),
    )
  }, [])

  const startHtmlReplace = useCallback((localId: string) => {
    setRecursos((prev) =>
      prev.map((recurso) =>
        recurso.localId === localId
          ? { ...recurso, replacingStorage: true, fileName: undefined, error: undefined }
          : recurso,
      ),
    )
  }, [])

  const cancelHtmlReplace = useCallback((localId: string) => {
    setRecursos((prev) =>
      prev.map((recurso) =>
        recurso.localId === localId
          ? { ...recurso, replacingStorage: false, fileName: undefined, error: undefined }
          : recurso,
      ),
    )
  }, [])

  const handleUrlBlur = useCallback((localId: string, value: string) => {
    if (!value.trim()) {
      setRecursos((prev) =>
        prev.map((recurso) =>
          recurso.localId === localId ? { ...recurso, tipo: null, error: undefined } : recurso,
        ),
      )
      return
    }

    setRecursos((prev) =>
      prev.map((recurso) => {
        if (recurso.localId !== localId) return recurso

        const detected = detectarRecurso(value)
        let tipo: 'YOUTUBE' | 'DRIVE' | 'HTML' | 'REPOSITORY' | 'OTHER' | null = null
        if (detected) {
          tipo = detected.tipo
        } else {
          tipo = isValidHttpsUrl(value) ? 'OTHER' : null
        }

        return {
          ...recurso,
          tipo,
          error: tipo ? undefined : 'Ingresá una URL válida (debe empezar con https://)',
        }
      }),
    )
  }, [])

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
