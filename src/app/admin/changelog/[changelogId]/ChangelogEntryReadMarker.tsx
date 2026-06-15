'use client'

import { useEffect } from 'react'

export function ChangelogEntryReadMarker({ entryId, unread }: { entryId: string; unread: boolean }) {
  useEffect(() => {
    if (!unread) return

    void fetch('/api/changelog/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryIds: [entryId] }),
    }).catch(() => undefined)
  }, [entryId, unread])

  return null
}
