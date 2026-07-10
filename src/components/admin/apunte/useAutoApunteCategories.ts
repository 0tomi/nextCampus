'use client'

import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { inferirCategoriasDeApunte } from '@/lib/apunte-categorias'
import type { RecursoDraft } from '@/lib/domain/apuntes/apunteForm'

type CategoriaOption = { id: string; nombre: string }

type AutoCategoryState = {
  selected: string[]
  dismissed: Set<string>
  autoSelected: Set<string>
  highlighted: Set<string>
}

type AutoCategoryAction =
  | { type: 'sync-inferred'; inferred: Set<string> }
  | { type: 'toggle'; categoriaId: string; inferred: Set<string> }
  | { type: 'clear-highlight' }

function areArraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

function areSetsEqual(a: Set<string>, b: Set<string>) {
  return a.size === b.size && [...a].every((id) => b.has(id))
}

function autoCategoryReducer(state: AutoCategoryState, action: AutoCategoryAction): AutoCategoryState {
  if (action.type === 'clear-highlight') {
    return state.highlighted.size === 0 ? state : { ...state, highlighted: new Set() }
  }

  if (action.type === 'toggle') {
    const { categoriaId, inferred } = action
    if (state.selected.includes(categoriaId)) {
      if (state.selected.length === 1) return state

      const autoSelected = new Set(state.autoSelected)
      const dismissed = new Set(state.dismissed)
      autoSelected.delete(categoriaId)
      if (inferred.has(categoriaId)) dismissed.add(categoriaId)

      return {
        ...state,
        autoSelected,
        dismissed,
        selected: state.selected.filter((id) => id !== categoriaId),
      }
    }

    const dismissed = new Set(state.dismissed)
    const autoSelected = new Set(state.autoSelected)
    dismissed.delete(categoriaId)
    autoSelected.delete(categoriaId)

    return {
      ...state,
      autoSelected,
      dismissed,
      selected: [...state.selected, categoriaId],
    }
  }

  const dismissed = new Set([...state.dismissed].filter((id) => action.inferred.has(id)))
  const selected = new Set(state.selected)
  const autoSelected = new Set(state.autoSelected)
  const addedAutomatically: string[] = []

  for (const id of autoSelected) {
    if (!action.inferred.has(id)) {
      selected.delete(id)
      autoSelected.delete(id)
    }
  }

  for (const id of action.inferred) {
    if (!dismissed.has(id) && !selected.has(id)) {
      selected.add(id)
      autoSelected.add(id)
      addedAutomatically.push(id)
    }
  }

  const selectedArray = [...selected]
  const highlighted = addedAutomatically.length > 0 ? new Set(addedAutomatically) : state.highlighted

  if (
    areArraysEqual(selectedArray, state.selected) &&
    areSetsEqual(dismissed, state.dismissed) &&
    areSetsEqual(autoSelected, state.autoSelected) &&
    highlighted === state.highlighted
  ) {
    return state
  }

  return {
    selected: selectedArray,
    dismissed,
    autoSelected,
    highlighted,
  }
}

export function useAutoApunteCategories({
  categoriasDisponibles,
  initialCategoriaIds,
  recursos,
}: {
  categoriasDisponibles: CategoriaOption[]
  initialCategoriaIds: string[]
  recursos: RecursoDraft[]
}) {
  const fallbackCategoriaId =
    categoriasDisponibles.find((categoria) => categoria.nombre === 'Otro')?.id ?? categoriasDisponibles[0]?.id ?? ''
  const [state, dispatch] = useReducer(autoCategoryReducer, initialCategoriaIds, (selected) => ({
    autoSelected: new Set<string>(),
    dismissed: new Set<string>(),
    highlighted: new Set<string>(),
    selected,
  }))

  const inferredCategoriaIds = useMemo(() => {
    const inferredNames = inferirCategoriasDeApunte(
      recursos.map((recurso) => ({
        tipo: recurso.tipo,
        url: recurso.url,
        nombre: recurso.nombre,
        fileName: recurso.fileName,
      })),
    )
    const ids = inferredNames.flatMap((nombre) => {
      const id = categoriasDisponibles.find((categoria) => categoria.nombre === nombre)?.id
      return id ? [id] : []
    })
    return new Set(ids)
  }, [categoriasDisponibles, recursos])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      dispatch({ type: 'sync-inferred', inferred: inferredCategoriaIds })
      window.setTimeout(() => dispatch({ type: 'clear-highlight' }), 900)
    }, 0)

    return () => window.clearTimeout(handle)
  }, [inferredCategoriaIds])

  const submitCategoriaIds = useMemo(() => {
    if (state.selected.length > 0) return state.selected

    const inferredNotDismissed = [...inferredCategoriaIds].filter((id) => !state.dismissed.has(id))
    if (inferredNotDismissed.length > 0) return inferredNotDismissed
    if (inferredCategoriaIds.size > 0) return []

    return fallbackCategoriaId ? [fallbackCategoriaId] : []
  }, [fallbackCategoriaId, inferredCategoriaIds, state.dismissed, state.selected])

  const toggleCategoria = useCallback(
    (categoriaId: string) => {
      dispatch({ type: 'toggle', categoriaId, inferred: inferredCategoriaIds })
    },
    [inferredCategoriaIds],
  )

  return {
    highlightCategoriaIds: state.highlighted,
    inferredCategoriaIds,
    selectedCategoriaIds: state.selected,
    submitCategoriaIds,
    toggleCategoria,
  }
}
