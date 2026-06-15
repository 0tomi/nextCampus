import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import { DarkCard } from '@/components/ui/DarkCard'
import { formatDate } from '@/lib/utils'
import type { ChangelogEntryView } from './types'

interface ChangelogFeedProps {
  entries: ChangelogEntryView[]
  emptyCopy?: string
  compact?: boolean
  linkEntries?: boolean
}

function audienceLabel(audience: ChangelogEntryView['audience']): string {
  switch (audience) {
    case 'ADMIN':
      return 'Administración'
    case 'SUPERVISOR':
      return 'Supervisión'
    case 'AYUDANTE':
      return 'Ayudantes'
    case 'PUBLIC':
      return 'General'
  }
}

export function ChangelogFeed({
  entries,
  emptyCopy = 'Todavía no hay novedades para mostrar.',
  compact = false,
  linkEntries = false,
}: ChangelogFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-none border border-dashed border-white/10 bg-surface-1 px-5 py-8 text-center text-sm leading-6 text-white/50">
        {emptyCopy}
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'stagger-children space-y-4'}>
      {entries.map((entry) => {
        const card = (
          <DarkCard className={compact ? 'p-4' : 'p-5 sm:p-6'}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/48">
                  {audienceLabel(entry.audience)}
                </span>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                  {formatDate(entry.visibleAt)}
                </span>
                {entry.unread ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
                    <span className="size-1.5 rounded-full bg-orange-400" aria-hidden />
                    Nuevo
                  </span>
                ) : null}
              </div>
              <div>
                <h3 className={compact ? 'text-sm font-black tracking-tight text-white' : 'text-xl font-black tracking-tight text-white'}>
                  {entry.title}
                </h3>
                <p className={compact ? 'mt-1 text-xs leading-5 text-white/55' : 'mt-2 max-w-2xl whitespace-pre-line text-sm leading-6 text-white/60'}>
                  {compact ? entry.summary : entry.description}
                </p>
              </div>
            </div>
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/60">
              {entry.unread ? <Sparkles className="size-4 text-amber-200" /> : <BookOpen className="size-4" />}
            </span>
          </div>
        </DarkCard>
        )

        if (!linkEntries) return <div key={entry.id}>{card}</div>

        return (
          <Link key={entry.id} href={`/admin/changelog/${encodeURIComponent(entry.changelogId)}`} className="block cursor-pointer transition-opacity hover:opacity-90">
            {card}
          </Link>
        )
      })}
    </div>
  )
}
