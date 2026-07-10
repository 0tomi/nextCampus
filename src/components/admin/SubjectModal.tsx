'use client'

import { useActionState, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormError } from '@/components/ui/FormError'
import {
  createSubjectAction,
  updateSubjectAction,
  type SubjectActionState,
} from '@/app/admin/actions/subjects'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkRow {
  label: string
  url: string
}

type LinksAction =
  | { type: 'ADD' }
  | { type: 'REMOVE'; index: number }
  | { type: 'UPDATE_FIELD'; index: number; field: keyof LinkRow; value: string }
  | { type: 'MOVE_UP'; index: number }
  | { type: 'MOVE_DOWN'; index: number }

function linksReducer(state: LinkRow[], action: LinksAction): LinkRow[] {
  switch (action.type) {
    case 'ADD':
      return [...state, { label: '', url: '' }]
    case 'REMOVE':
      return state.filter((_, i) => i !== action.index)
    case 'UPDATE_FIELD': {
      const next = [...state]
      next[action.index] = { ...next[action.index], [action.field]: action.value }
      return next
    }
    case 'MOVE_UP': {
      if (action.index === 0) return state
      const next = [...state]
      ;[next[action.index - 1], next[action.index]] = [next[action.index], next[action.index - 1]]
      return next
    }
    case 'MOVE_DOWN': {
      if (action.index === state.length - 1) return state
      const next = [...state]
      ;[next[action.index], next[action.index + 1]] = [next[action.index + 1], next[action.index]]
      return next
    }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SubjectModalProps {
  open: boolean
  onClose: () => void
  /** Si se pasa, el modal edita esa materia. Si es undefined, crea una nueva. */
  subject?: {
    id: string
    nombre: string
    descripcion?: string
    links?: { label: string; url: string; orden: number }[]
  }
  /** ID del año al que pertenece la materia (requerido para crear). */
  yearId?: string
  onSuccess?: () => void
}

const emptyState: SubjectActionState = { ok: false, message: '' }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubjectModal({
  open,
  onClose,
  subject,
  yearId,
  onSuccess,
}: SubjectModalProps) {
  const isEdit = !!subject
  const router = useRouter()

  const initialLinks: LinkRow[] = subject?.links
    ? subject.links
        .toSorted((a, b) => a.orden - b.orden)
        .map(({ label, url }) => ({ label, url }))
    : []

  const [links, dispatch] = useReducer(linksReducer, initialLinks)

  const action = isEdit ? updateSubjectAction : createSubjectAction

  const submitSubject = async (
    previousState: SubjectActionState,
    formData: FormData,
  ) => {
    const nextState = await action(previousState, formData)

    if (nextState.ok) {
      if (nextState.newSlug && nextState.yearSlug) {
        router.replace(`/${nextState.yearSlug}/${nextState.newSlug}`)
      }
      onSuccess?.()
      onClose()
    }

    return nextState
  }

  const [state, formAction, pending] = useActionState(submitSubject, emptyState)

  const title = isEdit ? 'Editar materia' : 'Nueva materia'

  const serializedLinks = JSON.stringify(
    links.filter((l) => l.url.trim() !== ''),
  )

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form action={formAction} className="space-y-4">
        {isEdit ? (
          <>
            <input type="hidden" name="id" value={subject.id} />
            <input type="hidden" name="yearId" value={yearId ?? ''} />
          </>
        ) : (
          <input type="hidden" name="yearId" value={yearId ?? ''} />
        )}

        {/* Serialized links for the server action */}
        <input type="hidden" name="links" value={serializedLinks} readOnly />

        {/* Nombre */}
        <div className="space-y-1">
          <Label htmlFor="subject-nombre">Nombre</Label>
          <Input
            id="subject-nombre"
            type="text"
            name="nombre"
            required
            defaultValue={subject?.nombre ?? ''}
            placeholder="Ej: Algoritmos y Estructuras de Datos"
          />
        </div>

        {/* Descripción */}
        <div className="space-y-1">
          <Label htmlFor="subject-descripcion">
            Descripción{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </Label>
          <Textarea
            id="subject-descripcion"
            name="descripcion"
            rows={3}
            defaultValue={subject?.descripcion ?? ''}
            placeholder="Breve descripción de la materia"
          />
        </div>

        {/* Links repeater */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Botones de acceso rápido{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </p>

          {links.map((link, index) => (
            <div
              key={index}
              className="rounded border border-white/10 bg-surface-0 p-3 space-y-2"
            >
              {/* Row controls: reorder + remove */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-white/30">Enlace {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'MOVE_UP', index })}
                    disabled={index === 0}
                    className="rounded px-1.5 py-0.5 text-xs text-white/40 hover:bg-white/5 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'MOVE_DOWN', index })}
                    disabled={index === links.length - 1}
                    className="rounded px-1.5 py-0.5 text-xs text-white/40 hover:bg-white/5 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                    title="Bajar"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'REMOVE', index })}
                    className="rounded px-1.5 py-0.5 text-xs text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                    title="Eliminar enlace"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Texto del botón */}
              <div className="space-y-1">
                <label htmlFor={`link-${index}-label`} className="block text-xs text-white/40">
                  Texto del botón{' '}
                  <span className="text-white/20">(opcional)</span>
                </label>
                <Input
                  id={`link-${index}-label`}
                  type="text"
                  aria-label="Texto del botón"
                  value={link.label}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE_FIELD', index, field: 'label', value: e.target.value })
                  }
                  placeholder="Ej: Ver apuntes"
                />
              </div>

              {/* Enlace */}
              <div className="space-y-1">
                <label htmlFor={`link-${index}-url`} className="block text-xs text-white/40">Enlace</label>
                <Input
                  id={`link-${index}-url`}
                  type="url"
                  aria-label="Enlace"
                  value={link.url}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE_FIELD', index, field: 'url', value: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => dispatch({ type: 'ADD' })}
            className="w-full rounded border border-dashed border-white/15 px-3 py-2 text-sm text-white/40 hover:border-white/25 hover:text-white/60 transition-colors cursor-pointer"
          >
            + Agregar enlace
          </button>
        </div>

        <FormError message={!state.ok ? state.message : ''} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending
              ? 'Guardando…'
              : isEdit
                ? 'Guardar cambios'
                : 'Crear materia'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
