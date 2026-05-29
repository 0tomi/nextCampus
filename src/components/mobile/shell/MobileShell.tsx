'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  GraduationCap,
  Menu,
  ChevronLeft,
  Shield,
  SlidersHorizontal,
  X,
  ChevronRight,
  Map,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getYearColorClasses } from '@/lib/yearColors'
import { InstallPWATopbarButton } from '@/components/pwa/InstallPWA'
import { usePreferences } from '@/hooks/usePreferences'
import { isYearVisible, isSubjectVisible } from '@/lib/preferences'

const SWIPE_EDGE_PX = 28
const SWIPE_OPEN_PX = 70
const SWIPE_CLOSE_PX = 60
const SWIPE_AXIS_BIAS = 1.4

export interface MobileShellDrawerSubject {
  id: string
  slug: string
  nombre: string
}

export interface MobileShellDrawerYear {
  slug: string
  nombre: string
  subjectsCount: number
  orden: number
  subjects?: MobileShellDrawerSubject[]
}

interface MobileShellProps {
  title?: string
  subtitle?: string
  onBack?: boolean | string
  drawerYears: MobileShellDrawerYear[]
  careerName: string
  currentYearSlug?: string
  children: ReactNode
  mainClassName?: string
}

export function MobileShell({
  title,
  subtitle,
  onBack,
  drawerYears,
  careerName,
  currentYearSlug,
  children,
  mainClassName,
}: MobileShellProps) {
  const { push, back } = useRouter()
  const pathname = usePathname()
  const { prefs } = usePreferences()
  const effectivePrefs = prefs

  // Filter drawerYears and their subjects based on preferences in a single iteration
  const yearsWithFilteredSubjects = drawerYears.reduce<typeof drawerYears>((acc, y) => {
    if (isYearVisible(y.slug, effectivePrefs)) {
      const filteredSubjects = (y.subjects ?? []).filter((s) =>
        isSubjectVisible(y.slug, s.slug, effectivePrefs),
      )
      acc.push({
        ...y,
        subjects: filteredSubjects,
      })
    }
    return acc
  }, [])

  const totalVisibleSubjects = yearsWithFilteredSubjects.reduce(
    (sum, y) => sum + (y.subjects?.length ?? 0),
    0,
  )

  const isSubjectsView = totalVisibleSubjects < 10

  const [drawer, setDrawer] = useState({ open: false, pathname })
  const open = drawer.open && drawer.pathname === pathname
  // Espejo del estado `open` para leerlo dentro de listeners de larga vida
  // (el effect de gestos se monta una sola vez). Se sincroniza en un effect,
  // nunca durante el render.
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  const openDrawer = useCallback(() => setDrawer({ open: true, pathname }), [pathname])
  const closeDrawer = useCallback(() => setDrawer({ open: false, pathname }), [pathname])

  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [closeDrawer, open])

  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false
    let committed = false

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]

      if (openRef.current) {
        tracking = true
        committed = false
        startX = touch.clientX
        startY = touch.clientY
        return
      }

      if (touch.clientX > SWIPE_EDGE_PX) return

      tracking = true
      committed = false
      startX = touch.clientX
      startY = touch.clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking || e.touches.length !== 1) return
      const touch = e.touches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (!committed) {
        if (absX < 10 && absY < 10) return
        if (absX < absY * SWIPE_AXIS_BIAS) {
          tracking = false
          return
        }
        committed = true
      }

      if (openRef.current && deltaX < -SWIPE_CLOSE_PX) {
        closeDrawer()
        tracking = false
        return
      }

      if (!openRef.current && deltaX > SWIPE_OPEN_PX) {
        openDrawer()
        tracking = false
      }
    }

    const handleTouchEnd = () => {
      tracking = false
      committed = false
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [closeDrawer, openDrawer])

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      {/* TOPBAR */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-white/5 bg-[rgba(20,20,20,0.92)] backdrop-blur-[14px] backdrop-saturate-[1.8]">
        <div className="flex h-full items-center justify-between px-3">
          <button
            type="button"
            aria-label={onBack ? 'Volver' : 'Abrir menú'}
            onClick={
              onBack
                ? typeof onBack === 'string'
                  ? () => push(onBack)
                  : () => back()
                : openDrawer
            }
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            {onBack ? (
              <ChevronLeft size={22} strokeWidth={2.5} />
            ) : (
              <Menu size={22} strokeWidth={2} />
            )}
          </button>

          <Link
            href="/"
            className="mx-3 flex min-w-0 flex-1 items-center gap-2.5 cursor-pointer"
          >
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-black">
              <GraduationCap size={16} strokeWidth={2.5} />
            </div>
            <div className="flex min-w-0 flex-col">
              {title && (
                <span className="truncate text-sm font-bold leading-tight text-white">
                  {title}
                </span>
              )}
              {subtitle && (
                <span className="truncate text-[9px] font-bold uppercase leading-tight tracking-[0.18em] text-white/40">
                  {subtitle}
                </span>
              )}
            </div>
          </Link>

          <InstallPWATopbarButton />
        </div>
      </header>

      {/* DRAWER */}
      <div
        aria-hidden={!open}
        onClick={closeDrawer}
        className={cn(
          'fixed inset-0 z-[60] bg-black/60 transition-opacity duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 left-0 z-[70] flex w-[304px] flex-col border-r border-white/[0.06] bg-[#141414] shadow-[24px_0_60px_rgba(0,0,0,0.5)]',
          'transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between border-b border-white/5 px-5 pb-4 pt-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              CARRERA
            </span>
            <span className="text-[17px] font-black leading-snug text-white">
              {careerName}
            </span>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={closeDrawer}
            className="mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <span className="mb-2 block px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {isSubjectsView ? 'MATERIAS' : 'AÑOS ACADÉMICOS'}
          </span>
          <ul className="flex flex-col gap-1">
            {isSubjectsView ? (
              yearsWithFilteredSubjects.flatMap((year) => {
                if (!year.subjects || year.subjects.length === 0) return []

                const header = (
                  <li key={`header-${year.slug}`} className="px-3 pt-3 pb-1 first:pt-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
                      {year.nombre}
                    </span>
                  </li>
                )

                const items = year.subjects.map((subject, subjectIndex) => {
                  const colors = getYearColorClasses(year.slug)
                  const isActive = pathname === `/${year.slug}/${subject.slug}`
                  return (
                    <li key={subject.id}>
                      <Link
                        href={`/${year.slug}/${subject.slug}`}
                        onClick={closeDrawer}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                          isActive ? 'bg-white/5' : 'hover:bg-white/5',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white',
                            colors.badgeClassName,
                          )}
                        >
                          <span className="text-[13px] font-black leading-none">
                            {subjectIndex + 1}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-bold leading-tight text-white">
                            {subject.nombre}
                          </span>
                        </div>
                        <ChevronRight
                          size={15}
                          strokeWidth={2}
                          className="shrink-0 text-white/30"
                        />
                      </Link>
                    </li>
                  )
                })

                return [header, ...items]
              })
            ) : (
              yearsWithFilteredSubjects.map((year) => {
                const colorClasses = getYearColorClasses(year.slug)
                const isActive = year.slug === currentYearSlug
                const subjectsCount = year.subjects?.length ?? 0
                return (
                  <li key={year.slug}>
                    <Link
                      href={`/${year.slug}`}
                      onClick={closeDrawer}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                        isActive ? 'bg-white/5' : 'hover:bg-white/5',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br',
                          colorClasses.badgeClassName,
                        )}
                      >
                        <span className="text-[13px] font-black leading-none">
                          {year.orden}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-bold leading-tight text-white">
                          {year.nombre}
                        </span>
                        <span className="mt-0.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em] text-white/40">
                          {subjectsCount}{' '}
                          {subjectsCount === 1 ? 'materia' : 'materias'}
                        </span>
                      </div>
                      <ChevronRight
                        size={15}
                        strokeWidth={2}
                        className="shrink-0 text-white/30"
                      />
                    </Link>
                  </li>
                )
              })
            )}
          </ul>
        </nav>

        <div className="border-t border-white/5 p-3">
          <div className="mb-3 flex flex-col gap-1">
            <Link
              href="/admin"
              onClick={closeDrawer}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                pathname.startsWith('/admin') ? 'bg-white/5' : 'hover:bg-white/5',
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-white/70">
                <Shield size={16} strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold leading-tight text-white">
                  Administración
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em] text-white/40">
                  Tu cuenta
                </span>
              </span>
              <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-white/30" />
            </Link>

            <Link
              href="/configurar"
              onClick={closeDrawer}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                pathname.startsWith('/configurar') ? 'bg-white/5' : 'hover:bg-white/5',
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-white/70">
                <SlidersHorizontal size={16} strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold leading-tight text-white">
                  Configurar
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em] text-white/40">
                  Preferencias
                </span>
              </span>
              <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-white/30" />
            </Link>
          </div>

          <Link
            href="/mapa"
            onClick={closeDrawer}
            className={cn(
              'group flex items-center justify-between rounded-lg border px-3 py-3 transition-all',
              pathname.startsWith('/mapa')
                ? 'border-amber-400/35 bg-amber-400/10'
                : 'border-amber-400/15 bg-gradient-to-r from-amber-500/10 to-orange-500/5 hover:border-amber-400/30 hover:bg-amber-500/12',
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.18)]">
                <Map size={16} strokeWidth={2.2} />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-bold leading-tight text-white">
                  Mapa de correlativas
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">
                  Recorrido interactivo
                </span>
              </div>
            </div>
            <ChevronRight
              size={15}
              strokeWidth={2}
              className="shrink-0 text-white/28 transition group-hover:translate-x-0.5 group-hover:text-white/56"
            />
          </Link>

          <div className="mt-3 flex items-center justify-between px-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              FCYT · UADER
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
              v alpha
            </span>
          </div>
        </div>
      </aside>

      <main className={cn('pb-12 pt-14', mainClassName)}>{children}</main>
    </div>
  )
}
