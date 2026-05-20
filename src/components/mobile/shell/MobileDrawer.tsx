'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X, ChevronRight } from 'lucide-react'
import { getYearColorClasses } from '@/lib/yearColors'
import type { MobileShellDrawerYear } from './MobileShell'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  years: MobileShellDrawerYear[]
  careerName: string
  currentYearSlug?: string
}

export function MobileDrawer({
  open,
  onClose,
  years,
  careerName,
  currentYearSlug,
}: MobileDrawerProps) {
  const pathname = usePathname()

  // Effect 1: keyboard ESC + body scroll lock
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Effect 2: close on path change
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-black/60',
          'transition-opacity duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={[
          'fixed top-0 bottom-0 left-0 z-50 w-[304px]',
          'bg-[#141414] border-r border-white/[0.06]',
          'shadow-[24px_0_60px_rgba(0,0,0,0.5)]',
          'flex flex-col',
          'transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/5 px-5 pt-5 pb-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              CARRERA
            </span>
            <span className="font-black text-[17px] text-white leading-snug">
              {careerName}
            </span>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0 mt-0.5"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 px-3 mb-2">
            AÑOS ACADÉMICOS
          </span>
          <ul className="flex flex-col gap-1">
            {years.map((year, idx) => {
              const colorClasses = getYearColorClasses(year.slug)
              const isActive = year.slug === currentYearSlug
              return (
                <li key={year.slug}>
                  <Link
                    href={`/year/${year.slug}`}
                    className={[
                      'flex items-center gap-3 rounded-lg',
                      'transition-colors cursor-pointer',
                      isActive
                        ? 'bg-white/5'
                        : 'hover:bg-white/5',
                    ].join(' ')}
                    style={{ padding: '10px 12px' }}
                  >
                    {/* Year badge */}
                    <div
                      className={[
                        'flex items-center justify-center w-[34px] h-[34px] shrink-0 rounded-md',
                        'bg-gradient-to-br',
                        colorClasses.badgeClassName,
                      ].join(' ')}
                    >
                      <span className="text-[13px] font-black leading-none">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Year info */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-white truncate leading-tight">
                        {year.nombre}
                      </span>
                      <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/40 leading-tight mt-0.5">
                        {year.subjectsCount} {year.subjectsCount === 1 ? 'materia' : 'materias'}
                      </span>
                    </div>

                    {/* Chevron */}
                    <ChevronRight size={15} strokeWidth={2} className="text-white/30 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/5 px-5 py-[14px]">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
            FCYT · UADER
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
            v alpha
          </span>
        </div>
      </div>
    </>
  )
}
