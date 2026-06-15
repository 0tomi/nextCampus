'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AdminControls } from '@/components/admin/AdminControls'
import { SignOutButton } from '@/components/admin/SignOutButton'
import { NotificationBell } from '@/components/changelog/NotificationBell'
import { CampusHeaderBrand } from '@/components/shell/CampusHeaderBrand'

const Mascot = dynamic(() => import('@/components/ui/Mascot').then((module) => module.Mascot))
const NosotrosModal = dynamic(() =>
  import('@/components/ui/NosotrosModal').then((module) => module.NosotrosModal),
)

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
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [hasOpenedAbout, setHasOpenedAbout] = useState(false)
  const drawerRef = useRef<HTMLDialogElement>(null)

  function openAbout() {
    setHasOpenedAbout(true)
    setIsAboutOpen(true)
  }

  const closeDrawer = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer) return

    const handleCancel = (event: Event) => {
      event.preventDefault()
      setIsOpen(false)
    }
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === drawer) setIsOpen(false)
    }

    if (isOpen && !drawer.open) drawer.showModal()
    if (!isOpen && drawer.open) drawer.close()

    drawer.addEventListener('cancel', handleCancel)
    drawer.addEventListener('click', handleBackdropClick)
    return () => {
      drawer.removeEventListener('cancel', handleCancel)
      drawer.removeEventListener('click', handleBackdropClick)
    }
  }, [isOpen])

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
      <header className="sticky top-0 z-40 h-[calc(4rem+var(--spacing-safe-top))] pt-safe-top border-b border-white/5 bg-surface-1">
        {resolvedHeaderOverlay}
        <div className="flex h-full items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/5 hover:text-white lg:hidden transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} strokeWidth={2} />
            </button>
            {brand ?? (
              <CampusHeaderBrand />
            )}
          </div>
          <div className="flex items-center gap-3">
            {pathname === '/' ? (
              <button
                type="button"
                onClick={openAbout}
                className="hidden lg:inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                Nosotros
              </button>
            ) : null}
            <NotificationBell target="desktop" />
            {topbar}
            <AdminControls>
              <SignOutButton />
            </AdminControls>
          </div>
        </div>
      </header>

      <dialog
        ref={drawerRef}
        aria-label="Menú de navegación"
        className={cn(
          'dashboard-drawer-dialog fixed inset-y-0 left-0 z-50 m-0 h-full max-h-none w-72 max-w-none flex-col border-r border-white/5 bg-[#141414] p-0 text-white shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm transition-transform duration-300 ease-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 pb-4 pt-[calc(1rem+var(--spacing-safe-top))]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Navegación
          </span>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sidebar}
        </div>
      </dialog>

      <div className="flex min-h-[calc(100vh-4rem-var(--spacing-safe-top))] items-start">
        <aside className="sticky top-[calc(4rem+var(--spacing-safe-top))] h-[calc(100vh-4rem-var(--spacing-safe-top))] w-72 shrink-0 overflow-hidden border-r border-white/5 bg-surface-2 hidden lg:block">
          {sidebar}
        </aside>

        <main className={cn('min-w-0 flex-1 bg-surface-0 p-6 sm:p-8', mainClassName)}>
          {children}
        </main>
      </div>

      {hasOpenedAbout ? (
        <NosotrosModal open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      ) : null}
    </div>
  )
}
