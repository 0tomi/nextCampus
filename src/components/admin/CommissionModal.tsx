'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormError } from '@/components/ui/FormError'
import {
  createCommissionAction,
  type CommissionActionState,
} from '@/app/admin/actions/subjects'
import type { CommissionOption } from '@/lib/commission-preferences'

interface CommissionModalProps {
  open: boolean
  onClose: () => void
  subject: {
    id: string
    nombre: string
  }
  commissions: readonly CommissionOption[]
}

const emptyState: CommissionActionState = { ok: false, message: '' }

export function CommissionModal({
  open,
  onClose,
  subject,
  commissions,
}: CommissionModalProps) {
  const router = useRouter()
  const submitCommission = async (
    _previousState: CommissionActionState,
    formData: FormData,
  ) => {
    const nextState = await createCommissionAction(_previousState, formData)

    if (nextState.ok) {
      router.refresh()
      onClose()
    }

    return nextState
  }

  const [state, formAction, pending] = useActionState(
    submitCommission,
    emptyState,
  )

  return (
    <Modal open={open} onClose={onClose} title="Nueva comisión">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="subjectId" value={subject.id} />

        <div className="rounded border border-white/8 bg-surface-0 px-4 py-3 text-sm text-white/62">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Materia
          </p>
          <p className="mt-1 font-semibold text-white">{subject.nombre}</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="commission-nombre">Comisión</Label>
          <Input
            id="commission-nombre"
            type="text"
            name="nombre"
            required
            placeholder="Ej: Comisión 2"
            className="focus:border-white/30"
          />
        </div>

        <div className="space-y-2 rounded border border-white/8 bg-surface-0 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Comisiones actuales
          </p>
          <div className="flex flex-wrap gap-2">
            {commissions.map((commission) => (
              <span
                key={commission.id}
                className="inline-flex rounded border border-white/10 bg-surface-1 px-2.5 py-1 text-xs font-semibold text-white/72"
              >
                {commission.nombre}
              </span>
            ))}
          </div>
        </div>

        <FormError message={!state.ok ? state.message : ''} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Guardando…' : 'Crear comisión'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
