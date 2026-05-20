import Link from 'next/link'
import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminControls } from '@/components/admin/AdminControls'
import { SignOutButton } from '@/components/admin/SignOutButton'

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
          <div className="flex items-center gap-3">
            {topbar}
            <AdminControls requireUserManagement>
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/78 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Usuarios
              </Link>
            </AdminControls>
            <AdminControls>
              <SignOutButton />
            </AdminControls>
          </div>
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
