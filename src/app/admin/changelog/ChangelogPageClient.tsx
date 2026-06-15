'use client'

import { ChangelogFeed } from '@/components/changelog/ChangelogFeed'
import { useChangelogEntries } from '@/components/changelog/useChangelogEntries'
import type { ChangelogEntryView } from '@/components/changelog/types'

export function ChangelogPageClient({ entries }: { entries: ChangelogEntryView[] }) {
  const { entries: liveEntries, markRead } = useChangelogEntries(entries)

  return (
    <ChangelogFeed
      entries={liveEntries}
      emptyCopy="Todavía no hay novedades para mostrar."
      onMarkRead={(entryIds) => void markRead(entryIds)}
    />
  )
}
