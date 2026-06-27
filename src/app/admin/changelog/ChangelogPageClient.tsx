'use client'

import { useEffect, useRef } from 'react'
import { ChangelogFeed } from '@/components/changelog/ChangelogFeed'
import { useChangelogEntries } from '@/components/changelog/useChangelogEntries'
import type { ChangelogEntryView } from '@/components/changelog/types'

export function ChangelogPageClient({ entries, nextCursor }: { entries: ChangelogEntryView[]; nextCursor: string | null }) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const {
    entries: liveEntries,
    loadingMore,
    nextCursor: liveNextCursor,
    loadMore,
    markRead,
  } = useChangelogEntries({ initialEntries: entries, initialNextCursor: nextCursor, limit: 15 })

  useEffect(() => {
    const unreadEntryIds: string[] = []
    for (const entry of liveEntries) {
      if (entry.unread) unreadEntryIds.push(entry.id)
    }
    if (unreadEntryIds.length > 0) void markRead(unreadEntryIds)
  }, [liveEntries, markRead])

  useEffect(() => {
    const marker = loadMoreRef.current
    if (!marker || !liveNextCursor) return

    const observer = new IntersectionObserver((items) => {
      if (items.some((item) => item.isIntersecting)) void loadMore()
    }, { rootMargin: '320px 0px' })

    observer.observe(marker)
    return () => observer.disconnect()
  }, [liveNextCursor, loadMore])

  return (
    <div className="space-y-4">
      <ChangelogFeed
        entries={liveEntries}
        emptyCopy="Todavía no hay novedades para mostrar."
      />
      {liveNextCursor ? (
        <div ref={loadMoreRef} className="py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/38">
          {loadingMore ? 'Cargando más novedades...' : 'Más novedades'}
        </div>
      ) : liveEntries.length > 0 ? (
        <p className="py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/30">
          No hay más novedades.
        </p>
      ) : null}
    </div>
  )
}
