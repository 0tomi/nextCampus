import { PERIODO_META, PERIODO_TONE_BG, type PeriodoCalendario } from '@/lib/periodos'

/**
 * Leyenda de colores de los períodos académicos. Solo muestra las categorías
 * que efectivamente hay cargadas, para no confundir con colores vacíos.
 */
export function PeriodoLegend({
  periodos,
  className,
}: {
  periodos: readonly PeriodoCalendario[]
  className?: string
}) {
  const categoriasPresentes = [...new Set(periodos.map((p) => p.categoria))]
  if (categoriasPresentes.length === 0) return null

  return (
    <div
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}
    >
      {categoriasPresentes.map((categoria) => (
        <span
          key={categoria}
          className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55"
        >
          <span
            className="h-2 w-4 rounded-[3px]"
            style={{ background: PERIODO_TONE_BG[PERIODO_META[categoria].tone] }}
          />
          {PERIODO_META[categoria].label}
        </span>
      ))}
    </div>
  )
}
