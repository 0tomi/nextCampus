'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FormError } from '@/components/ui/FormError'
import {
  updateQuizBankDescriptionAction,
  type QuizBankActionState,
} from '@/app/admin/actions/quiz'
import { LIMITS } from '@/lib/domain/quiz-bank'

interface QuizBankDescriptionModalProps {
  subjectSlug: string
  bankId: string
  bankName: string
  initialDescription: string
  onClose: () => void
}

const emptyState: QuizBankActionState = { ok: false, message: '' }

// Se monta solo mientras está abierto, así cada apertura arranca con estado
// limpio (useActionState no se resetea solo).
export function QuizBankDescriptionModal({
  subjectSlug,
  bankId,
  bankName,
  initialDescription,
  onClose,
}: QuizBankDescriptionModalProps) {
  const [state, formAction, pending] = useActionState(
    updateQuizBankDescriptionAction,
    emptyState,
  )

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message)
      onClose()
    }
  }, [state, onClose])

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar descripción"
      titleId="quiz-bank-description-modal-title"
      className="max-w-lg"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="subjectSlug" value={subjectSlug} />
        <input type="hidden" name="bankId" value={bankId} />
        <div className="space-y-2">
          <label
            htmlFor="quiz-bank-description"
            className="block text-sm text-white/52"
          >
            Contá de qué trata <span className="font-semibold text-white/80">{bankName}</span>: temas, para qué examen sirve o cómo conviene usarlo.
          </label>
          <Textarea
            id="quiz-bank-description"
            name="descripcion"
            defaultValue={initialDescription}
            maxLength={LIMITS.description}
            rows={5}
            placeholder="Ej: Repaso de las unidades 1 a 3 para el primer parcial."
          />
          <p className="text-xs text-white/40">Podés dejarla vacía para quitarla.</p>
        </div>

        <FormError
          message={!state.ok ? state.message : ''}
          className="rounded-none border-rose-500/30 px-4 py-3 text-rose-200"
        />

        <div className="flex justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="cursor-pointer rounded-none border-0 px-4 py-2.5 font-semibold text-white/58 hover:bg-transparent"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={pending}
            className="cursor-pointer rounded-none bg-primary px-5 py-2.5 font-bold text-white transition-colors hover:bg-primary-light disabled:opacity-40"
          >
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
