'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Menu, ChevronLeft, Shield } from 'lucide-react'
import Link from 'next/link'
import { MobileDrawer } from './MobileDrawer'
import type { MobileShellDrawerYear } from './MobileShell'

interface MobileTopbarProps {
  title?: string
  subtitle?: string
  onBack?: boolean
  drawerYears: MobileShellDrawerYear[]
  careerName: string
  currentYearSlug?: string
}

export function MobileTopbar({
  title,
  subtitle,
  onBack,
  drawerYears,
  careerName,
  currentYearSlug,
}: MobileTopbarProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-30 h-14 bg-[rgba(20,20,20,0.92)] backdrop-blur-[14px] backdrop-saturate-[1.8] border-b border-white/5">
        <div className="flex items-center justify-between h-full px-3">
          {/* Left zone — hamburger or back */}
          <button
            type="button"
            aria-label={onBack ? 'Volver' : 'Abrir menú'}
            onClick={onBack ? () => router.back() : () => setOpen(true)}
            className="flex items-center justify-center w-10 h-10 cursor-pointer rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            {onBack ? (
              <ChevronLeft size={22} strokeWidth={2.5} />
            ) : (
              <Menu size={22} strokeWidth={2} />
            )}
          </button>

          {/* Center zone — brand */}
          <div className="flex items-center gap-2.5 flex-1 mx-3 min-w-0">
            <div className="flex items-center justify-center w-[30px] h-[30px] shrink-0 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-black">
              <GraduationCap size={16} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              {title && (
                <span className="font-bold text-sm text-white leading-tight truncate">
                  {title}
                </span>
              )}
              {subtitle && (
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/40 truncate leading-tight">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Right zone — admin link */}
          <Link
            href="/admin"
            aria-label="Administración"
            className="flex items-center justify-center w-10 h-10 cursor-pointer rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <Shield size={17} strokeWidth={2} />
          </Link>
        </div>
      </header>

      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        years={drawerYears}
        careerName={careerName}
        currentYearSlug={currentYearSlug}
      />
    </>
  )
}
