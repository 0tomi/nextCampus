'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell, ArrowRight } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { ChangelogFeed } from './ChangelogFeed'
import { useChangelogEntries } from './useChangelogEntries'

type NotificationBellTarget = 'desktop' | 'mobile'

export function NotificationBell({ target }: { target: NotificationBellTarget }) {
  const enabled = useNotificationBellEnabled(target)
  const { entries, loading, error, markRead } = useChangelogEntries({ enabled })
  const [open, setOpen] = useState(false)
  const unreadEntries = entries.filter((entry) => entry.unread)
  const recentEntries = entries.slice(0, 5)
  const hasUnread = unreadEntries.length > 0
  const panelOpen = enabled && open

  function openPanel() {
    if (!enabled) return
    setOpen(true)
    if (unreadEntries.length > 0) {
      void markRead(unreadEntries.map((entry) => entry.id))
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (panelOpen ? setOpen(false) : openPanel())}
        className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-transparent text-white/62 transition-colors hover:bg-white/5 hover:text-white"
        aria-label="Abrir novedades"
        aria-expanded={panelOpen}
      >
        <Bell className="size-4" />
        {hasUnread ? (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.55)]" aria-hidden />
        ) : null}
      </button>

      {panelOpen && target === 'desktop' ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 hidden w-[min(420px,calc(100vw-2rem))] border border-white/8 bg-surface-1 shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:block">
          <NotificationPanelContent
            entries={recentEntries}
            error={error}
            loading={loading}
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}

      {target === 'mobile' ? (
        <Sheet open={panelOpen} onClose={() => setOpen(false)} title="Novedades">
          <NotificationPanelContent
            entries={recentEntries}
            error={error}
            loading={loading}
            onClose={() => setOpen(false)}
          />
        </Sheet>
      ) : null}
    </div>
  )
}

function useNotificationBellEnabled(target: NotificationBellTarget) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const sync = () => setEnabled(target === 'desktop' ? media.matches : !media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [target])

  return enabled
}

function NotificationPanelContent({
  entries,
  error,
  loading,
  onClose,
}: {
  entries: ReturnType<typeof useChangelogEntries>['entries']
  error: string
  loading: boolean
  onClose: () => void
}) {
  return (
    <div className="space-y-4 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Novedades</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-white">Qué cambió en el campus</h2>
        </div>
        <Link
          href="/admin/changelog"
          onClick={onClose}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          Ver todo
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-20 animate-pulse bg-white/[0.06]" />
          <div className="h-20 animate-pulse bg-white/[0.06]" />
        </div>
      ) : error ? (
        <p className="rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
      ) : (
        <ChangelogFeed
          compact
          entries={entries}
          emptyCopy="Ya estás al día."
        />
      )}
    </div>
  )
}
