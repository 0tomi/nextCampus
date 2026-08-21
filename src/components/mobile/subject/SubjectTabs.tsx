'use client'

import { useState } from 'react'
import { CalendarDays, Sparkles, NotebookTabs } from 'lucide-react'
import { AgendaTab } from './tabs/AgendaTab'
import { QuizTab } from './tabs/QuizTab'
import { ApuntesTab } from './tabs/ApuntesTab'
import { getYearColorClasses } from '@/lib/yearColors'
import type { MobileCalendarEvent } from '@/components/mobile/calendar/MobileCalendar'
import type { CommissionOption } from '@/lib/commission-preferences'
import type { PeriodoCalendario } from '@/lib/periodos'
import type { RecursoTipo } from '@/lib/recursos'

type TabKey = 'agenda' | 'quiz' | 'apuntes'

interface TipoEvento {
  id: string
  nombre: string
}

interface EventModalSubject {
  id: string
  slug: string
  nombre: string
  agendaId: string
  commissions: readonly CommissionOption[]
  categoriasDisponibles?: Array<{ id: string; nombre: string }>
}

interface SubjectTabsProps {
  subjectId: string
  subjectSlug: string
  subjectName: string
  yearSlug: string
  yearColor?: string | null
  yearId: string
  agendaId: string
  events: MobileCalendarEvent[]
  periodos?: readonly PeriodoCalendario[]
  apuntes: Array<{
    id: string
    titulo: string
    slug: string
    descripcion: string | null
    createdAt: string
    createdByUserId: string | null
    categorias: Array<{ id: string; nombre: string }>
    recursos: Array<{ id: string; tipo: RecursoTipo; url: string; orden: number; nombre: string | null; storageKey?: string | null; mimeType?: string | null; sizeBytes?: number | null }>
  }>
  categorias: Array<{ id: string; nombre: string }>
  apuntesHasMore: boolean
  apuntesNextCursor: string | null
  tiposEvento: readonly TipoEvento[]
  subjects?: readonly EventModalSubject[]
  commissions: readonly CommissionOption[]
  focusApunteSlug?: string
  activeCommissionName?: string
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

export function SubjectTabs({ subjectId, subjectSlug, subjectName, yearSlug, yearColor, yearId, agendaId, events, periodos, apuntes, categorias, apuntesHasMore, apuntesNextCursor, tiposEvento, subjects, commissions, focusApunteSlug, activeCommissionName }: SubjectTabsProps) {
  const [active, setActive] = useState<TabKey>(() => {
    if (focusApunteSlug) return 'apuntes'
    if (typeof window === 'undefined') return 'agenda'
    const hash = window.location.hash
    return hash in HASH_MAP ? HASH_MAP[hash] : 'agenda'
  })
  const colors = getYearColorClasses({ slug: yearSlug, color: yearColor })

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
                type="button"
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(key)}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 h-11 rounded-md',
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

      <div key={active} className="subject-tab-panel">
        {active === 'agenda' && (
          <AgendaTab
            events={events}
            periodos={periodos}
            accent={colors.tone}
            yearId={yearId}
            yearSlug={yearSlug}
            subjectSlug={subjectSlug}
            agendaId={agendaId}
            tiposEvento={tiposEvento}
            subjects={subjects}
            commissions={commissions}
            activeCommissionName={activeCommissionName}
          />
        )}
        {active === 'quiz' && <QuizTab subjectSlug={subjectSlug} subjectName={subjectName} yearSlug={yearSlug} yearColor={yearColor} yearId={yearId} />}
        {active === 'apuntes' && (
          <ApuntesTab
            apuntes={apuntes}
            categorias={categorias}
            yearId={yearId}
            yearSlug={yearSlug}
            subjectId={subjectId}
            subjectSlug={subjectSlug}
            initialHasMore={apuntesHasMore}
            initialNextCursor={apuntesNextCursor}
            focusApunteSlug={focusApunteSlug}
          />
        )}
      </div>
    </div>
  )
}
