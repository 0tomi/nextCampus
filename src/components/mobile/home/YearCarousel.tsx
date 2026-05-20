'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Layers } from 'lucide-react'
import { getYearColorClasses } from '@/lib/yearColors'

interface CarouselYear {
  id: string
  slug: string
  nombre: string
  subjects: Array<{ id: string; slug: string; nombre: string }>
}

export function YearCarousel({ years }: { years: CarouselYear[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slidesRef = useRef<Array<HTMLDivElement | null>>([])
  const [page, setPage] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    setPage(idx)
  }, [])

  const scrollTo = useCallback((idx: number) => {
    const slide = slidesRef.current[idx]
    if (!slide) return
    slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    setPage(idx)
  }, [])

  return (
    <div className="flex flex-col gap-3.5">
      {/* PILL ROW */}
      <div className="flex gap-2 px-[18px] overflow-x-auto scrollbar-none">
        {years.map((y, idx) => {
          const colors = getYearColorClasses(y.slug)
          const active = page === idx
          return (
            <button
              key={y.id}
              type="button"
              onClick={() => scrollTo(idx)}
              className={[
                'shrink-0 h-8 px-3 rounded-full inline-flex items-center gap-2',
                'text-xs font-bold cursor-pointer transition-all',
                active
                  ? 'bg-white/5 text-white'
                  : 'bg-transparent text-white/55 border border-white/10 hover:text-white/80',
              ].join(' ')}
              style={active ? { border: `1px solid ${colors.tone}` } : undefined}
            >
              <span
                className="block w-2 h-2 rounded-sm"
                style={{ background: colors.tone }}
              />
              Año {idx + 1}
            </button>
          )
        })}
      </div>

      {/* SCROLLER */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory py-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {years.map((y, idx) => {
          const colors = getYearColorClasses(y.slug)
          return (
            <div
              key={y.id}
              ref={(el) => { slidesRef.current[idx] = el }}
              className="snap-start px-[18px]"
              style={{ flex: '0 0 100%', minWidth: '100%' }}
            >
              <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden flex flex-col">
                {/* Gradient header */}
                <Link
                  href={`/year/${y.slug}`}
                  className={[
                    'flex items-start justify-between gap-3 px-[18px] py-[18px] cursor-pointer',
                    'bg-gradient-to-r',
                    colors.badgeClassName,
                  ].join(' ')}
                >
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/55">
                      Año {idx + 1} · {y.subjects.length} {y.subjects.length === 1 ? 'materia' : 'materias'}
                    </p>
                    <h3 className={['mt-1 text-xl font-black tracking-tight', (colors.name === 'violet' || colors.name === 'rose') ? 'text-white' : 'text-black'].join(' ')}>
                      {y.nombre}
                    </h3>
                  </div>
                  <div className={['w-10 h-10 rounded-lg flex items-center justify-center bg-black/20', (colors.name === 'violet' || colors.name === 'rose') ? 'text-white' : 'text-black'].join(' ')}>
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </div>
                </Link>

                {/* Subjects */}
                <ul className="flex flex-col">
                  {y.subjects.map((s, sIdx) => (
                    <li
                      key={s.id}
                      className={sIdx !== 0 ? 'border-t border-white/5' : ''}
                    >
                      <Link
                        href={`/materia/${s.slug}`}
                        className="flex items-center gap-3 px-[18px] py-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                      >
                        <Layers size={14} className="text-white/25 shrink-0" />
                        <span className="flex-1 min-w-0 text-[13px] font-semibold text-white/75 leading-snug">
                          {s.nombre}
                        </span>
                        <ChevronRight size={14} className="text-white/30 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      {/* DOTS */}
      <div className="flex gap-1.5 justify-center pt-1">
        {years.map((y, idx) => {
          const colors = getYearColorClasses(y.slug)
          const active = page === idx
          return (
            <button
              key={y.id}
              type="button"
              aria-label={`Ir al año ${idx + 1}`}
              onClick={() => scrollTo(idx)}
              className="h-1.5 rounded-full cursor-pointer transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                width: active ? 22 : 6,
                background: active ? colors.tone : 'rgba(255,255,255,0.18)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
