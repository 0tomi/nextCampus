'use client'

import {
  useId,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { CalendarDays, Sparkles, NotebookTabs } from 'lucide-react'
import { AgendaTab } from './tabs/AgendaTab'
import { QuizTab } from './tabs/QuizTab'
import { ApuntesTab } from './tabs/ApuntesTab'
import { ApuntesFeed } from '@/components/apuntes/ApuntesFeed'
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
  desktopAgenda?: ReactNode
  desktopQuiz?: ReactNode
  notesHeading?: ReactNode
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
    recursos: Array<{
      id: string
      tipo: RecursoTipo
      url: string
      orden: number
      nombre: string | null
      storageKey?: string | null
      mimeType?: string | null
      sizeBytes?: number | null
    }>
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

export function getAdjacentTabKey(current: TabKey, key: string): TabKey | null {
  const index = TABS.findIndex((tab) => tab.key === current)
  switch (key) {
    case 'ArrowRight':
      return TABS[(index + 1) % TABS.length].key
    case 'ArrowLeft':
      return TABS[(index - 1 + TABS.length) % TABS.length].key
    case 'Home':
      return TABS[0].key
    case 'End':
      return TABS[TABS.length - 1].key
    default:
      return null
  }
}

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function getHashSnapshot(): string {
  return window.location.hash
}

function getHashServerSnapshot(): string {
  return ''
}

export function SubjectTabs({
  desktopAgenda,
  desktopQuiz,
  notesHeading,
  subjectId,
  subjectSlug,
  subjectName,
  yearSlug,
  yearColor,
  yearId,
  agendaId,
  events,
  periodos,
  apuntes,
  categorias,
  apuntesHasMore,
  apuntesNextCursor,
  tiposEvento,
  subjects,
  commissions,
  focusApunteSlug,
  activeCommissionName,
}: SubjectTabsProps) {
  const rawHash = useSyncExternalStore(
    subscribeToHash,
    getHashSnapshot,
    getHashServerSnapshot,
  )

  const active: TabKey = focusApunteSlug
    ? 'apuntes'
    : rawHash in HASH_MAP
      ? HASH_MAP[rawHash]
      : 'agenda'

  const colors = getYearColorClasses({ slug: yearSlug, color: yearColor })
  const baseId = useId()
  const tabId = (key: TabKey) => `${baseId}-tab-${key}`
  // The shared notes section keeps its anchor id so #apuntes links still land on it.
  const panelId = (key: TabKey) =>
    desktopAgenda && key === 'apuntes' ? 'apuntes' : `${baseId}-panel-${key}`
  const panelProps = (key: TabKey) => ({
    id: panelId(key),
    role: 'tabpanel' as const,
    'aria-labelledby': tabId(key),
  })

  const onSelect = (key: TabKey) => {
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', `#${key}`)
      window.dispatchEvent(new Event('hashchange'))
    }
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = getAdjacentTabKey(active, event.key)
    if (!next) return
    event.preventDefault()
    onSelect(next)
    document.getElementById(tabId(next))?.focus()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={desktopAgenda ? 'px-[18px] lg:hidden' : 'px-[18px]'}>
        <div
          role="tablist"
          aria-label="Secciones de la materia"
          className="flex p-1 rounded-[10px] bg-[#0f0f0f] gap-1"
        >
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key
            return (
              <button
                type="button"
                key={key}
                id={tabId(key)}
                role="tab"
                aria-selected={isActive}
                aria-controls={desktopAgenda || isActive ? panelId(key) : undefined}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelect(key)}
                onKeyDown={onTabKeyDown}
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

      {desktopAgenda ? (
        <>
          <div className="hidden lg:block">{desktopAgenda}</div>
          <div
            {...panelProps('agenda')}
            className={active === 'agenda' ? 'lg:hidden' : 'hidden'}
          >
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
          </div>
          <div className="hidden lg:block">{desktopQuiz}</div>
          <div
            {...panelProps('quiz')}
            className={active === 'quiz' ? 'lg:hidden' : 'hidden'}
          >
            <QuizTab
              subjectSlug={subjectSlug}
              subjectName={subjectName}
              yearSlug={yearSlug}
              yearColor={yearColor}
              yearId={yearId}
            />
          </div>
          <section
            {...panelProps('apuntes')}
            className={
              active === 'apuntes' ? 'space-y-4' : 'hidden space-y-4 lg:block'
            }
          >
            <div className="hidden lg:block">{notesHeading}</div>
            <ApuntesFeed
              variant="responsive"
              subjectId={subjectId}
              subjectSlug={subjectSlug}
              yearId={yearId}
              yearSlug={yearSlug}
              categorias={categorias}
              initialItems={apuntes}
              initialHasMore={apuntesHasMore}
              initialNextCursor={apuntesNextCursor}
              focusApunteSlug={focusApunteSlug}
            />
          </section>
        </>
      ) : (
        <div key={active} {...panelProps(active)} className="subject-tab-panel">
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
          {active === 'quiz' && (
            <QuizTab
              subjectSlug={subjectSlug}
              subjectName={subjectName}
              yearSlug={yearSlug}
              yearColor={yearColor}
              yearId={yearId}
            />
          )}
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
      )}
    </div>
  )
}
