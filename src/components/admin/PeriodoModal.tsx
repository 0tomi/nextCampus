'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { AlertDialog } from '@/components/ui/AlertDialog'
import {
  createPeriodoAction,
  updatePeriodoAction,
  deletePeriodo,
  type PeriodoActionState,
} from '@/app/admin/actions'
import {
  CATEGORIAS_PERIODO,
  PERIODO_META,
  PERIODO_TONE_BG,
  type PeriodoCalendario,
} from '@/lib/periodos'
import { eventDateToLocal } from '@/lib/utils'

const emptyState: PeriodoActionState = { ok: false, message: '' }

function formatRange(fechaInicio: string, fechaFin: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const inicio = eventDateToLocal(fechaInicio).toLocaleDateString('es-AR', opts)
  if (fechaInicio === fechaFin) return inicio
  const fin = eventDateToLocal(fechaFin).toLocaleDateString('es-AR', { ...opts, year: 'numeric' })
  return `${inicio} – ${fin}`
}

interface PeriodoModalProps {
  open: boolean
  onClose: () => void
  periodos: readonly PeriodoCalendario[]
}

export function PeriodoModal({ open, onClose, periodos }: PeriodoModalProps) {
  if (!open) return null
  return <PeriodoModalContent open={open} onClose={onClose} periodos={periodos} />
}

function PeriodoModalContent({ open, onClose, periodos }: PeriodoModalProps) {
  const [editing, setEditing] = useState<PeriodoCalendario | null>(null)
  const [showForm, setShowForm] = useState(periodos.length === 0)

  return (
    <Modal open={open} onClose={onClose} title="Períodos académicos">
      <div className="space-y-5">
        {showForm ? (
          <PeriodoForm
            key={editing?.id ?? 'new'}
            periodo={editing}
            onDone={() => {
              setEditing(null)
              setShowForm(false)
            }}
            onCancel={() => {
              setEditing(null)
              setShowForm(false)
            }}
          />
        ) : (
          <>
            <PeriodoList
              periodos={periodos}
              onEdit={(periodo) => {
                setEditing(periodo)
                setShowForm(true)
              }}
            />
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              className="w-full cursor-pointer rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:bg-white/8 hover:text-white"
            >
              + Agregar período
            </button>
          </>
        )}
      </div>
    </Modal>
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
      <p className="rounded border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-sm text-white/42">
        Todavía no cargaste ningún período.
      </p>
    )
  }

  return (
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
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
  const meta = PERIODO_META[periodo.categoria]

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
    <div className="flex items-center gap-3 rounded border border-white/8 bg-surface-0 px-3 py-2">
      <span
        aria-hidden="true"
        className="h-8 w-1.5 shrink-0 rounded-full"
        style={{ background: PERIODO_TONE_BG[meta.tone] }}
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
        description="Esta acción no se puede deshacer. El período se va a quitar del calendario."
        confirmText="Eliminar"
        variant="destructive"
      />
    </div>
  )
}

function PeriodoForm({
  periodo,
  onDone,
  onCancel,
}: {
  periodo: PeriodoCalendario | null
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
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

  return (
    <form action={formAction} className="space-y-4">
      {periodo ? <input type="hidden" name="id" value={periodo.id} /> : null}

      <div className="space-y-1">
        <label htmlFor="periodo-categoria" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
          Tipo de período
        </label>
        <select
          id="periodo-categoria"
          name="categoria"
          required
          defaultValue={periodo?.categoria ?? ''}
          className="w-full cursor-pointer rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
        >
          <option value="" disabled>
            Seleccioná un tipo
          </option>
          {CATEGORIAS_PERIODO.map((categoria) => (
            <option key={categoria} value={categoria}>
              {PERIODO_META[categoria].label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="periodo-titulo" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
          Título
        </label>
        <input
          id="periodo-titulo"
          type="text"
          name="titulo"
          required
          defaultValue={periodo?.titulo ?? ''}
          placeholder="Ej: Mesas de examen de mayo"
          className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="periodo-inicio" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
            Desde
          </label>
          <input
            id="periodo-inicio"
            type="date"
            name="fechaInicio"
            required
            defaultValue={periodo?.fechaInicio ?? ''}
            className="w-full cursor-pointer rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="periodo-fin" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
            Hasta
          </label>
          <input
            id="periodo-fin"
            type="date"
            name="fechaFin"
            required
            defaultValue={periodo?.fechaFin ?? ''}
            className="w-full cursor-pointer rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none"
          />
        </div>
      </div>

      {state.message && !state.ok ? (
        <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Guardando…' : periodo ? 'Guardar cambios' : 'Crear período'}
        </button>
      </div>
    </form>
  )
}
