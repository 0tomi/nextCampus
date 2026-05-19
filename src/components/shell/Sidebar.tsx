import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_BADGE_CLASSNAME =
  'from-amber-400 to-orange-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'

export interface SidebarItem {
  id: string
  href: string
  label: string
  badge: ReactNode
  meta?: string
  active?: boolean
  badgeClassName?: string
}

interface SidebarProps {
  items: SidebarItem[]
  title?: string
  eyebrow?: string
  emptyState?: ReactNode
  className?: string
  ariaLabel?: string
  secondaryEyebrow?: string
}

export function Sidebar({
  items,
  title,
  eyebrow,
  emptyState,
  className,
  ariaLabel = 'Dashboard sidebar navigation',
  secondaryEyebrow,
}: SidebarProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {title || eyebrow ? (
        <div className="border-b border-white/5 px-5 py-5">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="mt-2 text-lg font-black tracking-tight text-white">
              {title}
            </h2>
          ) : null}
        </div>
      ) : null}

      <nav aria-label={ariaLabel} className="flex-1 px-3 py-4">
        {secondaryEyebrow ? (
          <div className="mb-4 px-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              {secondaryEyebrow}
            </p>
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="border border-dashed border-white/10 px-4 py-5 text-sm text-white/45">
            {emptyState ?? 'Todavía no hay elementos para mostrar.'}
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-200 hover:bg-white/5',
                    item.active && 'bg-white/5',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br text-xs font-black tracking-normal',
                      item.badgeClassName ?? DEFAULT_BADGE_CLASSNAME,
                    )}
                  >
                    {item.badge}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {item.label}
                    </span>
                    {item.meta ? (
                      <span className="mt-1 block truncate text-[11px] uppercase tracking-[0.16em] text-white/42">
                        {item.meta}
                      </span>
                    ) : null}
                  </span>

                  <ChevronRight className="h-4 w-4 shrink-0 text-white/24 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/54" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  )
}
