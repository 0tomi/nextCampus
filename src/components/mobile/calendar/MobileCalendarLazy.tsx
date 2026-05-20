'use client'

import dynamic from 'next/dynamic'
import type { MobileCalendarProps } from './MobileCalendar'

const MobileCalendar = dynamic(
  () => import('./MobileCalendar').then((m) => m.MobileCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="mx-[18px] h-72 animate-pulse rounded-xl border border-white/5 bg-[#1a1a1a]" />
    ),
  },
)

export function MobileCalendarLazy(props: MobileCalendarProps) {
  return <MobileCalendar {...props} />
}
