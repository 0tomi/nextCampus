'use client'

import { useMemo } from 'react'
import { DarkCard } from '@/components/ui/DarkCard'
import {
  filterEventsByPreferredCommission,
  type CommissionOption,
  type CommissionAwareEvent,
} from '@/lib/commission-preferences'
import { usePreferredCommissionId } from '@/components/commissions/usePreferredCommission'

interface SubjectEventSummaryCardProps {
  subjectSlug: string
  apuntesCount: number
  commissions: readonly CommissionOption[]
  activeCommission?: CommissionOption | null
  events: readonly CommissionAwareEvent[]
}

export function SubjectEventSummaryCard({
  subjectSlug,
  apuntesCount,
  commissions,
  activeCommission,
  events,
}: SubjectEventSummaryCardProps) {
  const preferredCommissionId = usePreferredCommissionId(
    subjectSlug,
    commissions,
    Boolean(activeCommission),
  )

  const visibleEventsCount = useMemo(() => {
    if (activeCommission) {
      return events.length
    }

    return filterEventsByPreferredCommission(events, preferredCommissionId).length
  }, [activeCommission, events, preferredCommissionId])

  return (
    <DarkCard className="p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
        Resumen
      </p>
      <div className="mt-4 space-y-4 text-sm text-white/64">
        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
          <span>Eventos</span>
          <strong className="text-lg font-black text-white">
            {visibleEventsCount}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
          <span>Apuntes</span>
          <strong className="text-lg font-black text-white">
            {apuntesCount}
          </strong>
        </div>
        {activeCommission ? (
          <div className="flex items-center justify-between gap-4">
            <span>Vista activa</span>
            <strong className="text-sm font-black uppercase tracking-[0.16em] text-white">
              {activeCommission.nombre}
            </strong>
          </div>
        ) : null}
      </div>
    </DarkCard>
  )
}
