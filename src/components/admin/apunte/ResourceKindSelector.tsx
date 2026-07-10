'use client'

import { Info } from 'lucide-react'
import type { RecursoDraftKind } from '@/lib/domain/apuntes/apunteForm'

export function ResourceKindSelector({
  kind,
  infoOpen,
  onInfoToggle,
  onKindChange,
}: {
  kind: RecursoDraftKind
  infoOpen: boolean
  onInfoToggle: () => void
  onKindChange: (kind: RecursoDraftKind) => void
}) {
  return (
    <div className="mb-2 flex items-center gap-1 rounded border border-white/8 bg-surface-0 p-1">
      <button
        type="button"
        onClick={() => onKindChange('LINK')}
        className={[
          'flex-1 cursor-pointer rounded px-2 py-1.5 text-xs font-semibold transition-colors',
          kind === 'LINK' ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/70',
        ].join(' ')}
      >
        Link
      </button>
      <button
        type="button"
        onClick={() => onKindChange('HTML')}
        className={[
          'flex-1 cursor-pointer rounded px-2 py-1.5 text-xs font-semibold transition-colors',
          kind === 'HTML' ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/70',
        ].join(' ')}
      >
        Apunte Interactivo
      </button>
      <button
        type="button"
        onClick={onInfoToggle}
        aria-label="¿Qué es este tipo de recurso?"
        aria-expanded={infoOpen}
        className={[
          'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors',
          infoOpen ? 'text-cyan-300' : 'text-white/40 hover:text-white/80',
        ].join(' ')}
      >
        <Info className="size-3.5" />
      </button>
    </div>
  )
}
