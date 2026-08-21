'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormError } from '@/components/ui/FormError'
import {
  createPeriodoAction,
  updatePeriodoAction,
  deletePeriodo,
  createCategoriaAction,
  type PeriodoActionState,
} from '@/app/admin/actions'
import {
  PERIODO_TONES,
  PERIODO_TONE_BG,
  type PeriodoCalendario,
  type CategoriaPeriodoDto,
  type PeriodoTone,
} from '@/lib/periodos'
import { eventDateToLocal } from '@/lib/utils'

const emptyState: PeriodoActionState = { ok: false, message: '' }

const rangeShortFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
})

const rangeFullFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatRange(fechaInicio: string, fechaFin: string): string {
  const inicio = rangeShortFormatter.format(eventDateToLocal(fechaInicio))
  if (fechaInicio === fechaFin) return inicio
  const fin = rangeFullFormatter.format(eventDateToLocal(fechaFin))
  return `${inicio} – ${fin}`
}

interface PeriodoManagerProps {
  periodos: readonly PeriodoCalendario[]
  categorias: readonly CategoriaPeriodoDto[]
}

export function PeriodoManager({ periodos, categorias }: PeriodoManagerProps) {
  const [editing, setEditing] = useState<PeriodoCalendario | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [localCategorias, setLocalCategorias] = useState<readonly CategoriaPeriodoDto[]>(categorias)

  const closeForm = () => {
    setEditing(null)
    setShowForm(false)
  }

  const handleNewCategoriaAdded = (nuevaCat: CategoriaPeriodoDto) => {
    setLocalCategorias((prev) => [...prev, nuevaCat].sort((a, b) => a.label.localeCompare(b.label)))
  }

  if (showForm) {
    return (
      <div className="max-w-xl rounded border border-white/8 bg-surface-1 p-5">
        <h2 className="mb-4 text-sm font-black tracking-tight text-white">
          {editing ? 'Editar período' : 'Nuevo período'}
        </h2>
        <PeriodoForm
          key={editing?.id ?? 'new'}
          periodo={editing}
          categorias={localCategorias}
          onDone={closeForm}
          onCancel={closeForm}
          onCategoriaAdded={handleNewCategoriaAdded}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/55">
          {periodos.length === 0
            ? 'Todavía no cargaste ningún período.'
            : `${periodos.length} ${periodos.length === 1 ? 'período cargado' : 'períodos cargados'}.`}
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="inline-flex shrink-0 items-center gap-1.5 px-3 hover:opacity-90"
        >
          <Plus className="size-4" />
          Agregar período
        </Button>
      </div>

      <PeriodoList
        periodos={periodos}
        onEdit={(periodo) => {
          setEditing(periodo)
          setShowForm(true)
        }}
      />
    </div>
  )
}

function PeriodoList({
  periodos,
  onEdit,
}: {
  periodos: readonly PeriodoCalendario[]
  onEdit: (periodo: PeriodoCalendario) => void
}) {
  if (periodos.length === 0) {
    return (
      <p className="rounded border border-dashed border-white/10 bg-white/[0.02] px-3 py-8 text-center text-sm text-white/42">
        Cuando agregues un período (feriados, mesas de examen, suspensión de clases) va a aparecer acá y se va a pintar en el calendario de todos los años.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {periodos.map((periodo) => (
        <PeriodoRow key={periodo.id} periodo={periodo} onEdit={onEdit} />
      ))}
    </div>
  )
}

function PeriodoRow({
  periodo,
  onEdit,
}: {
  periodo: PeriodoCalendario
  onEdit: (periodo: PeriodoCalendario) => void
}) {
  const router = useRouter()
  const [isDeleting, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const meta = periodo.categoria

  const handleDelete = () => {
    setConfirmOpen(false)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('id', periodo.id)
        await deletePeriodo(formData)
        router.refresh()
        toast.success('Período eliminado')
      } catch {
        toast.error('No pudimos eliminar el período. Probá de nuevo.')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded border border-white/8 bg-surface-0 px-3 py-2.5">
      <span
        aria-hidden="true"
        className="h-9 w-1.5 shrink-0 rounded-full"
        style={{ background: PERIODO_TONE_BG[meta.tone as PeriodoTone] || PERIODO_TONE_BG.sky }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{periodo.titulo}</p>
        <p className="text-[11px] text-white/45">
          {meta.label} · {formatRange(periodo.fechaInicio, periodo.fechaFin)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(periodo)}
        aria-label="Editar período"
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        disabled={isDeleting}
        onClick={() => setConfirmOpen(true)}
        aria-label="Eliminar período"
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>

      <AlertDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar período"
        description="Esta acción no se puede deshacer. El período se va a quitar del calendario de todos los años."
        confirmText="Eliminar"
        variant="destructive"
      />
    </div>
  )
}

function PeriodoForm({
  periodo,
  categorias,
  onDone,
  onCancel,
  onCategoriaAdded,
}: {
  periodo: PeriodoCalendario | null
  categorias: readonly CategoriaPeriodoDto[]
  onDone: () => void
  onCancel: () => void
  onCategoriaAdded: (nuevaCat: CategoriaPeriodoDto) => void
}) {
  const router = useRouter()
  const [selectedCategoriaId, setSelectedCategoriaId] = useState(periodo?.categoriaId ?? '')
  const [showNewCatForm, setShowNewCatForm] = useState(false)

  // Creador inline de categorías
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatTone, setNewCatTone] = useState<PeriodoTone>('sky')
  const [catPending, startCatTransition] = useTransition()

  const action = periodo ? updatePeriodoAction : createPeriodoAction
  const submit = async (prev: PeriodoActionState, formData: FormData) => {
    const next = await action(prev, formData)
    if (next.ok) {
      toast.success(periodo ? 'Período actualizado' : 'Período creado')
      router.refresh()
      onDone()
    } else if (next.message) {
      toast.error(next.message)
    }
    return next
  }
  const [state, formAction, pending] = useActionState(submit, emptyState)

  const handleSaveCategoria = () => {
    if (!newCatLabel.trim()) {
      toast.error('Poné un nombre para el tipo de período.')
      return
    }
    startCatTransition(async () => {
      const formData = new FormData()
      formData.append('label', newCatLabel)
      formData.append('tone', newCatTone)
      const res = await createCategoriaAction({ ok: false, message: '' }, formData)

      if (res.ok && res.data) {
        toast.success(res.message)
        onCategoriaAdded(res.data)
        setSelectedCategoriaId(res.data.id)
        setShowNewCatForm(false)
        setNewCatLabel('')
        setNewCatTone('sky')
      } else {
        toast.error(res.message || 'No pudimos crear el tipo de período.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Subformulario Inline para crear nueva categoría */}
      {showNewCatForm ? (
        <div className="rounded border border-white/10 bg-surface-0 p-4 space-y-3">
          <h3 className="text-xs font-black tracking-tight text-white uppercase">
            Crear nuevo tipo de período
          </h3>
          <div className="space-y-1">
            <Label htmlFor="new-cat-label" className="text-[11px]">
              Nombre del tipo
            </Label>
            <Input
              id="new-cat-label"
              type="text"
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="Ej: Feriado puente, Inscripciones, etc."
              className="bg-surface-1 focus:border-white/30 focus:ring-1 focus:ring-white/10"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Color asignado
            </span>
            <div className="flex flex-wrap gap-2.5">
              {PERIODO_TONES.map((tone) => {
                const isSelected = newCatTone === tone
                return (
                  <button
                    key={tone}
                    type="button"
                    aria-label={`Seleccionar tono ${tone}`}
                    onClick={() => setNewCatTone(tone)}
                    className={`group relative flex size-7 cursor-pointer items-center justify-center rounded-full border transition-all duration-[120ms] ${
                      isSelected
                        ? 'border-white bg-white/15 scale-110 shadow-lg'
                        : 'border-white/10 bg-transparent hover:border-white/30 hover:scale-105'
                    }`}
                  >
                    <span
                      className="size-3.5 rounded-full"
                      style={{ background: PERIODO_TONE_BG[tone] }}
                    />
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              disabled={catPending}
              onClick={() => {
                setShowNewCatForm(false)
                setSelectedCategoriaId('')
              }}
              className="px-3 py-1.5 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={catPending}
              onClick={handleSaveCategoria}
              className="px-3 py-1.5 text-xs hover:opacity-90"
            >
              {catPending ? 'Guardando...' : 'Guardar tipo'}
            </Button>
          </div>
        </div>
      ) : null}

      <form action={formAction} className={`space-y-4 ${showNewCatForm ? 'pointer-events-none opacity-40' : ''}`}>
        {periodo ? <input type="hidden" name="id" value={periodo.id} /> : null}

        <div className="space-y-1">
          <Label htmlFor="periodo-categoria">Tipo de período</Label>
          <select
            id="periodo-categoria"
            name="categoriaId"
            required
            value={selectedCategoriaId}
            onChange={(e) => {
              const val = e.target.value
              if (val === 'NEW_CATEGORY') {
                setShowNewCatForm(true)
              } else {
                setSelectedCategoriaId(val)
              }
            }}
            className="w-full cursor-pointer rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
          >
            <option value="" disabled>
              Seleccioná un tipo
            </option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.label}
              </option>
            ))}
            <option value="NEW_CATEGORY" className="font-bold text-emerald-400">
              + Crear nuevo tipo...
            </option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="periodo-titulo">Título</Label>
          <Input
            id="periodo-titulo"
            type="text"
            name="titulo"
            required
            defaultValue={periodo?.titulo ?? ''}
            placeholder="Ej: Mesas de examen de mayo"
            className="focus:border-white/30 focus:ring-1 focus:ring-white/10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="periodo-inicio">Desde</Label>
            <Input
              id="periodo-inicio"
              type="date"
              name="fechaInicio"
              required
              defaultValue={periodo?.fechaInicio ?? ''}
              className="cursor-pointer focus:border-white/30 focus:ring-1 focus:ring-white/10"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="periodo-fin">Hasta</Label>
            <Input
              id="periodo-fin"
              type="date"
              name="fechaFin"
              required
              defaultValue={periodo?.fechaFin ?? ''}
              className="cursor-pointer focus:border-white/30 focus:ring-1 focus:ring-white/10"
            />
          </div>
        </div>

        <FormError message={!state.ok ? state.message : ''} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Guardando…' : periodo ? 'Guardar cambios' : 'Crear período'}
          </Button>
        </div>
      </form>
    </div>
  )
}
