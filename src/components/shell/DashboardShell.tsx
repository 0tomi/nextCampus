import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  brand?: ReactNode
  sidebar: ReactNode
  children: ReactNode
  topbar?: ReactNode
  className?: string
  mainClassName?: string
}

export function DashboardShell({
  brand,
  sidebar,
  children,
  topbar,
  className,
  mainClassName,
}: DashboardShellProps) {
  return (
    <div className={cn('min-h-screen bg-surface-0 text-white', className)}>
      <header className="sticky top-0 z-40 h-16 border-b border-white/5 bg-surface-1">
        <div className="flex h-full items-center justify-between gap-4 px-6">
          {brand ?? (
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 bg-gradient-to-br from-red-500 to-orange-400" />
              <span className="text-xs font-black uppercase tracking-[0.24em] text-white/72">
                NextCampus
              </span>
            </div>
          )}
          {topbar ? <div className="flex items-center gap-3">{topbar}</div> : null}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="w-72 shrink-0 border-r border-white/5 bg-surface-2">
          <div className="h-full overflow-y-auto">{sidebar}</div>
        </aside>

        <main className={cn('flex-1 bg-surface-0 p-8', mainClassName)}>
          {children}
        </main>
      </div>
    </div>
  )
}
