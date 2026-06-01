'use client'

import { DarkCard } from '@/components/ui/DarkCard'
import { cn } from '@/lib/utils'
import type { Resultado } from './quizTypes'

type UnitStat = {
  name: string
  correctas: number
  total: number
  pct: number
}

function buildUnitStats(resultados: Resultado[]): UnitStat[] {
  const map = new Map<string, { correctas: number; total: number }>()
  for (const resultado of resultados) {
    const current = map.get(resultado.unitName) ?? { correctas: 0, total: 0 }
    current.total += 1
    if (resultado.correcta) current.correctas += 1
    map.set(resultado.unitName, current)
  }

  return Array.from(map.entries()).map(([name, summary]) => ({
    name,
    correctas: summary.correctas,
    total: summary.total,
    pct: summary.total > 0 ? Math.round((summary.correctas / summary.total) * 100) : 0,
  }))
}

function unitTone(pct: number): { bar: string; text: string } {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-300' }
  if (pct >= 60) return { bar: 'bg-amber-500', text: 'text-amber-300' }
  return { bar: 'bg-rose-500', text: 'text-rose-300' }
}

export function UnitBreakdown({ resultados }: { resultados: Resultado[] }) {
  const stats = buildUnitStats(resultados)
  if (stats.length === 0) return null

  return (
    <DarkCard className="p-6 sm:p-8">
      <h3 className="font-display text-lg font-black tracking-tight text-white">Desempeño por unidad</h3>
      <p className="mt-1 text-sm text-white/48">Cómo te fue en cada tema según las preguntas que te tocaron.</p>
      <div className="mt-6 space-y-5">
        {stats.map((unit) => {
          const tone = unitTone(unit.pct)
          const needsReview = unit.pct < 60

          return (
            <div key={unit.name}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold text-white">{unit.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-white/52">
                  {unit.correctas}/{unit.total} <span className={cn('font-bold', tone.text)}>{unit.pct}%</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-white/[0.06]">
                <div className={cn('h-full rounded-sm transition-[width] duration-500 ease-out', tone.bar)} style={{ width: `${unit.pct}%` }} />
              </div>
              {needsReview ? <p className="mt-2 text-xs leading-5 text-rose-300/80">Estás flojo en {unit.name}: te conviene repasar este tema.</p> : null}
            </div>
          )
        })}
      </div>
    </DarkCard>
  )
}
