'use client'

import { useEffect, useActionState, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import {
  createYearAction,
  updateYearAction,
  type YearActionState,
} from '@/app/admin/actions'
import { detectarRecurso } from '@/lib/recursos'
import { YEAR_COLOR_PRESETS } from '@/lib/yearColors'

interface YearModalProps {
  open: boolean
  onClose: () => void
  /** Si se pasa, el modal edita ese año. Si es undefined, crea uno nuevo. */
  year?: {
    id: string
    nombre: string
    descripcion?: string | null
    driveUrl?: string | null
    playlistUrl?: string | null
    playlistEnabled?: boolean
    discordUrl?: string | null
    discordDescripcion?: string | null
    discordAltUrl?: string | null
    discordAltDescripcion?: string | null
    orden: number
    color?: string | null
  }
  /** Se llama cuando la acción termina bien (para cerrar el modal). */
  onSuccess?: () => void
}

const emptyState: YearActionState = { ok: false, message: '' }

export function YearModal({ open, onClose, year, onSuccess }: YearModalProps) {
  const isEdit = !!year
  const [playlistUrlError, setPlaylistUrlError] = useState('')
  const colorScope = year?.id ?? 'new-year'
  const [colorDraft, setColorDraft] = useState(() => ({
    scope: colorScope,
    value: year?.color ?? '',
  }))
  const color = colorDraft.scope === colorScope ? colorDraft.value : (year?.color ?? '')
  const setColor = (value: string) => setColorDraft({ scope: colorScope, value })

  const handlePlaylistUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim()
    if (!val) {
      setPlaylistUrlError('')
      return
    }
    const result = detectarRecurso(val)
    setPlaylistUrlError(
      !result || result.tipo !== 'YOUTUBE'
        ? 'El link debe ser de YouTube (youtube.com o youtu.be).'
        : '',
    )
  }

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

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={year.id} />}

        <div className="space-y-1">
          <label
            htmlFor="year-nombre"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Nombre
          </label>
          <input
            id="year-nombre"
            type="text"
            name="nombre"
            required
            defaultValue={year?.nombre ?? ''}
            placeholder="Ej: Primer año"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="year-descripcion"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Descripción{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <textarea
            id="year-descripcion"
            name="descripcion"
            rows={3}
            defaultValue={year?.descripcion ?? ''}
            placeholder="Breve descripción del año"
            className="w-full resize-none rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="year-driveUrl"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Enlace de Google Drive{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <input
            id="year-driveUrl"
            type="url"
            name="driveUrl"
            defaultValue={year?.driveUrl ?? ''}
            placeholder="Ej: https://drive.google.com/drive/folders/..."
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="year-playlistUrl"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Playlist de YouTube{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <input
            id="year-playlistUrl"
            type="url"
            name="playlistUrl"
            defaultValue={year?.playlistUrl ?? ''}
            placeholder="Ej: https://www.youtube.com/playlist?list=..."
            onBlur={handlePlaylistUrlBlur}
            className={`w-full rounded border bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none ${
              playlistUrlError
                ? 'border-rose-400/50 focus:border-rose-400/70'
                : 'border-white/10 focus:border-white/20'
            }`}
          />
          {playlistUrlError && (
            <p className="text-xs text-rose-400">{playlistUrlError}</p>
          )}
        </div>

        <input type="hidden" name="playlistEnabled" value="true" />

        <div className="space-y-1">
          <label
            htmlFor="year-discordUrl"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Enlace de Discord{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <input
            id="year-discordUrl"
            type="url"
            name="discordUrl"
            defaultValue={year?.discordUrl ?? ''}
            placeholder="Ej: https://discord.gg/..."
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
          <input
            id="year-discordDescripcion"
            type="text"
            name="discordDescripcion"
            defaultValue={year?.discordDescripcion ?? ''}
            placeholder="Descripción del Discord (opcional)"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="year-discordAltUrl"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Enlace de Discord alternativo{' '}
            <span className="font-normal normal-case tracking-normal text-white/30">
              (opcional)
            </span>
          </label>
          <input
            id="year-discordAltUrl"
            type="url"
            name="discordAltUrl"
            defaultValue={year?.discordAltUrl ?? ''}
            placeholder="Ej: https://discord.gg/..."
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
          <input
            id="year-discordAltDescripcion"
            type="text"
            name="discordAltDescripcion"
            defaultValue={year?.discordAltDescripcion ?? ''}
            placeholder="Descripción del Discord alternativo (opcional)"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <input type="hidden" name="color" value={color} />

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
          <label
            htmlFor="year-orden"
            className="block text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            Orden
          </label>
          <input
            id="year-orden"
            type="number"
            name="orden"
            required
            min={1}
            defaultValue={year?.orden ?? ''}
            placeholder="Ej: 1"
            className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
          <p className="text-[11px] text-white/30">
            Determina el orden en que aparece el año en la lista.
          </p>
        </div>

        {state.message && !state.ok && (
          <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {state.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear año'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
