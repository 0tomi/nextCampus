'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  readPreferredCommissionId,
  subscribeToPreferredCommissionChanges,
  type CommissionOption,
} from '@/lib/commission-preferences'

export function usePreferredCommissionId(
  subjectSlug: string,
  commissions: readonly CommissionOption[],
  disabled = false,
) {
  return useSyncExternalStore(
    subscribeToPreferredCommissionChanges,
    () => (disabled ? null : readPreferredCommissionId(subjectSlug, commissions)),
    () => null,
  )
}

export function usePreferredCommissionMap(
  subjects: readonly {
    slug: string
    commissions: readonly CommissionOption[]
  }[],
) {
  const snapshot = useSyncExternalStore(
    subscribeToPreferredCommissionChanges,
    () =>
      JSON.stringify(
        Object.fromEntries(
          subjects.map((subject) => [
            subject.slug,
            readPreferredCommissionId(subject.slug, subject.commissions),
          ]),
        ),
      ),
    () => '{}',
  )

  return useMemo(
    () => JSON.parse(snapshot) as Record<string, string | null>,
    [snapshot],
  )
}
