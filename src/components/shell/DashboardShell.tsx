'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminControls } from '@/components/admin/AdminControls'
import { SignOutButton } from '@/components/admin/SignOutButton'
import { CampusHeaderBrand } from '@/components/shell/CampusHeaderBrand'
import { Mascot } from '@/components/ui/Mascot'
import { NosotrosModal } from '@/components/ui/NosotrosModal'

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
  const [isOpen, setIsOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  // Bloquear scroll cuando el drawer móvil está abierto
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/5 hover:text-white lg:hidden transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} strokeWidth={2} />
            </button>
            {brand ?? (
              <CampusHeaderBrand />
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="hidden lg:inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              Nosotros
            </button>
            {topbar}
            <AdminControls>
              <SignOutButton />
            </AdminControls>
          </div>
        </div>
      </header>

      {/* Drawer móvil - Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-240 lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Drawer móvil - Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-[#141414] shadow-2xl transition-transform duration-300 ease-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Navegación
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" onClick={() => setIsOpen(false)}>
          {sidebar}
        </div>
      </aside>

      <div className="flex min-h-[calc(100vh-4rem)] items-start">
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-72 shrink-0 overflow-hidden border-r border-white/5 bg-surface-2 hidden lg:block">
          {sidebar}
        </aside>

        <main className={cn('min-w-0 flex-1 bg-surface-0 p-6 sm:p-8', mainClassName)}>
          {children}
        </main>
      </div>

      <NosotrosModal open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  )
}
