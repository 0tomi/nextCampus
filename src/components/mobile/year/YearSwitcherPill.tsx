'use client'

import { useRouter } from 'next/navigation'
import { getYearColorClasses } from '@/lib/yearColors'

interface YearSwitcherPillProps {
  years: Array<{ slug: string; nombre: string }>
  currentSlug: string
}

export function YearSwitcherPill({ years, currentSlug }: YearSwitcherPillProps) {
  const router = useRouter()
  return (
    <div className="flex gap-2 px-[18px] overflow-x-auto scrollbar-none">
      {years.map((y, idx) => {
        const colors = getYearColorClasses(y.slug)
        const active = y.slug === currentSlug
        return (
          <button
            key={y.slug}
            type="button"
            onClick={() => router.push(`/year/${y.slug}`)}
            className={[
              'shrink-0 h-8 px-3 rounded-full inline-flex items-center gap-2',
              'text-xs font-bold cursor-pointer transition-all',
              active
                ? 'bg-white/5 text-white'
                : 'bg-transparent text-white/55 border border-white/10 hover:text-white/80',
            ].join(' ')}
            style={active ? { border: `1px solid ${colors.tone}` } : undefined}
          >
            <span className="block w-2 h-2 rounded-sm" style={{ background: colors.tone }} />
            Año {idx + 1}
          </button>
        )
      })}
    </div>
  )
}
