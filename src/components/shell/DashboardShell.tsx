import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AdminControls } from '@/components/admin/AdminControls'
import { SignOutButton } from '@/components/admin/SignOutButton'
import { CampusHeaderBrand } from '@/components/shell/CampusHeaderBrand'
import { Mascot } from '@/components/ui/Mascot'

interface DashboardShellProps {
  brand?: ReactNode
  sidebar: ReactNode
  children: ReactNode
  topbar?: ReactNode
  headerOverlay?: ReactNode
  className?: string
  mainClassName?: string
}

export function DashboardShell({
  brand,
  sidebar,
  children,
  topbar,
  headerOverlay,
  className,
  mainClassName,
}: DashboardShellProps) {
  const resolvedHeaderOverlay = headerOverlay === undefined ? (
    <div className="absolute bottom-[-1px] left-[332px] z-10 hidden lg:block">
      <Mascot size={60} />
    </div>
  ) : headerOverlay

  return (
    <div className={cn('min-h-screen bg-surface-0 text-white', className)}>
      <header className="sticky top-0 z-40 h-16 border-b border-white/5 bg-surface-1">
        {resolvedHeaderOverlay}
        <div className="flex h-full items-center justify-between gap-4 px-6">
          {brand ?? (
            <CampusHeaderBrand />
          )}
          <div className="flex items-center gap-3">
            {topbar}
            <AdminControls>
              <SignOutButton />
            </AdminControls>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] items-start">
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-72 shrink-0 overflow-hidden border-r border-white/5 bg-surface-2">
          {sidebar}
        </aside>

        <main className={cn('min-w-0 flex-1 bg-surface-0 p-8', mainClassName)}>
          {children}
        </main>
      </div>
    </div>
  )
}
