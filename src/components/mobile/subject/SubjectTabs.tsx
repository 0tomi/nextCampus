'use client'

import { useState } from 'react'
import { CalendarDays, Sparkles, NotebookTabs } from 'lucide-react'
import { AgendaTab } from './tabs/AgendaTab'
import { QuizTab } from './tabs/QuizTab'
import { ApuntesTab } from './tabs/ApuntesTab'
import { getYearColorClasses } from '@/lib/yearColors'

type TabKey = 'agenda' | 'quiz' | 'apuntes'

interface SubjectTabsProps {
  subjectSlug: string
  subjectName: string
  yearSlug: string
  events: Array<{ id: string; titulo: string; fecha: Date | string; tipo: string }>
  apuntes: Array<{ id: string; titulo: string; descripcionHtml: string | null; recursos: Array<{ id: string; tipo: 'YOUTUBE' | 'DRIVE'; url: string; orden: number }> }>
}

const TABS: Array<{ key: TabKey; label: string; Icon: typeof CalendarDays }> = [
  { key: 'agenda', label: 'Agenda', Icon: CalendarDays },
  { key: 'quiz', label: 'Quiz', Icon: Sparkles },
  { key: 'apuntes', label: 'Apuntes', Icon: NotebookTabs },
]

const HASH_MAP: Record<string, TabKey> = {
  '#agenda': 'agenda',
  '#quiz': 'quiz',
  '#apuntes': 'apuntes',
}

export function SubjectTabs({ subjectSlug, subjectName, yearSlug, events, apuntes }: SubjectTabsProps) {
  const [active, setActive] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'agenda'
    const hash = window.location.hash
    return hash in HASH_MAP ? HASH_MAP[hash] : 'agenda'
  })
  const colors = getYearColorClasses(yearSlug)

  const onSelect = (key: TabKey) => {
    setActive(key)
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', `#${key}`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="px-[18px]">
        <div role="tablist" className="flex p-1 rounded-[10px] bg-[#0f0f0f] gap-1">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(key)}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md',
                  'text-xs font-bold cursor-pointer transition-colors',
                  isActive
                    ? 'bg-[#1f1f1f] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'text-white/50 hover:text-white/80',
                ].join(' ')}
              >
                <Icon size={13} strokeWidth={2} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        {active === 'agenda' && <AgendaTab events={events} accent={colors.tone} />}
        {active === 'quiz' && <QuizTab subjectSlug={subjectSlug} subjectName={subjectName} yearSlug={yearSlug} />}
        {active === 'apuntes' && <ApuntesTab apuntes={apuntes} />}
      </div>
    </div>
  )
}
