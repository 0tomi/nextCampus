'use client'

import { useEffect, useActionState, useReducer, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormError } from '@/components/ui/FormError'
import {
  createYearAction,
  updateYearAction,
  type YearActionState,
} from '@/app/admin/actions/years'
import { YEAR_COLOR_PRESETS } from '@/lib/yearColors'

interface LinkRow {
  label: string
  url: string
}

interface EditableLinkRow extends LinkRow {
  /** Identidad de UI únicamente; nunca se envía al servidor. */
  uiKey: string
}

let nextLinkUiKey = 0

function toEditableLinks(rows: LinkRow[]): EditableLinkRow[] {
  return rows.map((row) => ({ ...row, uiKey: `link-${nextLinkUiKey++}` }))
}

type LinksAction =
  | { type: 'ADD' }
  | { type: 'REMOVE'; index: number }
  | { type: 'UPDATE_FIELD'; index: number; field: keyof LinkRow; value: string }
  | { type: 'MOVE_UP'; index: number }
  | { type: 'MOVE_DOWN'; index: number }

function linksReducer(
  state: EditableLinkRow[],
  action: LinksAction,
): EditableLinkRow[] {
  switch (action.type) {
    case 'ADD':
      return [...state, { label: '', url: '', uiKey: `link-${nextLinkUiKey++}` }]
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

interface YearModalProps {
  open: boolean
  onClose: () => void
  /** Si se pasa, el modal edita ese año. Si es undefined, crea uno nuevo. */
  year?: {
    id: string
    nombre: string
    descripcion?: string | null
    links?: { label: string; url: string; orden: number }[]
    orden: number
    color?: string | null
  }
  /** Se llama cuando la acción termina bien (para cerrar el modal). */
  onSuccess?: () => void
}

const emptyState: YearActionState = { ok: false, message: '' }

export function YearModal({ open, onClose, year, onSuccess }: YearModalProps) {
  const isEdit = !!year
  const colorScope = year?.id ?? 'new-year'
  const [colorDraft, setColorDraft] = useState(() => ({
    scope: colorScope,
    value: year?.color ?? '',
  }))
  const color = colorDraft.scope === colorScope ? colorDraft.value : (year?.color ?? '')
  const setColor = (value: string) => setColorDraft({ scope: colorScope, value })

  const initialLinks: LinkRow[] = year?.links
    ? year.links.toSorted((a, b) => a.orden - b.orden).map(({ label, url }) => ({ label, url }))
    : []
  const [links, dispatch] = useReducer(linksReducer, initialLinks, toEditableLinks)

  const action = isEdit ? updateYearAction : createYearAction
  const [state, formAction, pending] = useActionState(action, emptyState)

  // Cerrar y avisar cuando la acción termina exitosamente
  useEffect(() => {
    if (state.ok) {
      onSuccess?.()
      onClose()
    }
  }, [state.ok, onClose, onSuccess])

  const title = isEdit ? 'Editar año' : 'Nuevo año'

  const serializedLinks = JSON.stringify(
    links.reduce<LinkRow[]>((acc, link) => {
      if (link.url.trim() !== '') {
        acc.push({ label: link.label, url: link.url })
      }
      return acc
    }, []),
  )

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={year.id} />}
        <input type="hidden" name="links" value={serializedLinks} readOnly />
        <input type="hidden" name="color" value={color} />

        <div className="space-y-1">
          <Label htmlFor="year-nombre">Nombre</Label>
          <Input
            id="year-nombre"
            type="text"
            name="nombre"
            required
            defaultValue={year?.nombre ?? ''}
            placeholder="Ej: Primer año"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="year-descripcion">
            Descripción{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </Label>
          <Textarea
            id="year-descripcion"
            name="descripcion"
            rows={3}
            defaultValue={year?.descripcion ?? ''}
            placeholder="Breve descripción del año"
          />
        </div>

        {/* Botones de acceso rápido (Drive, Discord, playlist, etc.) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Botones de acceso rápido{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </p>

          {links.map((link, index) => (
            <div
              key={link.uiKey}
              className="rounded border border-white/10 bg-surface-0 p-3 space-y-2"
            >
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

              <div className="space-y-1">
                <label htmlFor={`year-link-${index}-label`} className="block text-xs text-white/40">
                  Texto del botón <span className="text-white/20">(opcional)</span>
                </label>
                <Input
                  id={`year-link-${index}-label`}
                  type="text"
                  aria-label="Texto del botón"
                  value={link.label}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE_FIELD', index, field: 'label', value: e.target.value })
                  }
                  placeholder="Ej: Drive del año"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`year-link-${index}-url`} className="block text-xs text-white/40">Enlace</label>
                <Input
                  id={`year-link-${index}-url`}
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

        <div className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/40">
            Color del año
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setColor('')}
              title="Color automático"
              aria-pressed={color === ''}
              className={`flex h-8 items-center rounded border px-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                color === ''
                  ? 'border-white/60 bg-white/10 text-white'
                  : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              Automático
            </button>

            {YEAR_COLOR_PRESETS.map((preset) => {
              const selected = color.toLowerCase() === preset.tone.toLowerCase()
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setColor(preset.tone)}
                  title={preset.name}
                  aria-label={`Usar color ${preset.name}`}
                  aria-pressed={selected}
                  className={`size-8 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${
                    selected ? 'border-white' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: preset.tone }}
                />
              )
            })}

            <label
              title="Color personalizado"
              className="flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-white/30 hover:border-white/60"
            >
              <input
                type="color"
                aria-label="Elegir color personalizado"
                value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#cc0000'}
                onChange={(e) => setColor(e.target.value)}
                className="size-10 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
          </div>
          <p className="text-[11px] text-white/30">
            Elegí un tono predefinido o uno personalizado. «Automático» asigna un color según el año.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="year-orden">Orden</Label>
          <Input
            id="year-orden"
            type="number"
            name="orden"
            required
            min={1}
            defaultValue={year?.orden ?? ''}
            placeholder="Ej: 1"
          />
          <p className="text-[11px] text-white/30">
            Determina el orden en que aparece el año en la lista.
          </p>
        </div>

        <FormError message={!state.ok ? state.message : ''} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear año'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
