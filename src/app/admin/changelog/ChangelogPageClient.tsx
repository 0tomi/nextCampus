'use client'

import { useEffect } from 'react'
import { ChangelogFeed } from '@/components/changelog/ChangelogFeed'
import { useChangelogEntries } from '@/components/changelog/useChangelogEntries'
import type { ChangelogEntryView } from '@/components/changelog/types'

export function ChangelogPageClient({ entries }: { entries: ChangelogEntryView[] }) {
  const { entries: liveEntries, markRead } = useChangelogEntries({ initialEntries: entries })

  useEffect(() => {
    const unreadEntryIds: string[] = []
    for (const entry of liveEntries) {
      if (entry.unread) unreadEntryIds.push(entry.id)
    }
    if (unreadEntryIds.length > 0) void markRead(unreadEntryIds)
  }, [liveEntries, markRead])

  return (
    <ChangelogFeed
      entries={liveEntries}
      emptyCopy="Todavía no hay novedades para mostrar."
    />
  )
}
