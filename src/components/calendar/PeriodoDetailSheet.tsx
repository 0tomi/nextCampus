'use client'

import { Sheet } from '@/components/ui/Sheet'
import { eventDateToLocal } from '@/lib/utils'
import { type PeriodoCalendario } from '@/lib/periodos'

const fullDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const shortDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
})

function formatRango(periodo: PeriodoCalendario): string {
  const inicio = fullDateFormatter.format(eventDateToLocal(periodo.fechaInicio))
  if (periodo.fechaInicio === periodo.fechaFin) return inicio
  const inicioCorto = shortDateFormatter.format(eventDateToLocal(periodo.fechaInicio))
  const fin = fullDateFormatter.format(eventDateToLocal(periodo.fechaFin))
  return `${inicioCorto} – ${fin}`
}

/** Detalle de solo lectura de un período pintado en el calendario. */
export function PeriodoDetailSheet({
  periodo,
  onClose,
}: {
  periodo: PeriodoCalendario | null
  onClose: () => void
}) {
  const meta = periodo ? periodo.categoria : null

  return (
    <Sheet open={Boolean(periodo)} onClose={onClose} title="Período del calendario">
      {periodo && meta ? (
        <div className="space-y-6">
          <div>
            <span className="mb-3 inline-flex rounded-none border border-white/14 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {meta.label}
            </span>
            <h3 className="font-display text-2xl font-black leading-tight tracking-tight text-white">
              {periodo.titulo}
            </h3>
          </div>
          <div className="space-y-4 border-t border-white/6 pt-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                Fechas
              </span>
              <span className="text-sm font-medium text-white/80">{formatRango(periodo)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </Sheet>
  )
}
