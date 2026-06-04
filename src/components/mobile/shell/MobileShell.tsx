'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  ChevronLeft,
  Shield,
  SlidersHorizontal,
  X,
  ChevronRight,
  Map,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getYearColorClasses } from '@/lib/yearColors'
import { usePreferences } from '@/hooks/usePreferences'
import { isYearVisible, isSubjectVisible, type UserPreferences } from '@/lib/preferences'

const SWIPE_EDGE_PX = 28
const SWIPE_OPEN_PX = 70
const SWIPE_CLOSE_PX = 60
const SWIPE_AXIS_BIAS = 1.4
const SUBJECTS_VIEW_THRESHOLD = 10

export interface MobileShellDrawerSubject {
  id: string
  slug: string
  nombre: string
}

export interface MobileShellDrawerYear {
  slug: string
  nombre: string
  color?: string | null
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

interface DrawerState {
  open: boolean
  pathname: string
}

interface UseDrawerResult {
  open: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

interface MobileTopbarProps {
  title?: string
  subtitle?: string
  onBack?: boolean | string
  onOpenMenu: () => void
}

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  careerName: string
  currentYearSlug?: string
  isSubjectsView: boolean
  pathname: string
  years: MobileShellDrawerYear[]
}

interface DrawerNavigationProps {
  isSubjectsView: boolean
  pathname: string
  currentYearSlug?: string
  years: MobileShellDrawerYear[]
  onClose: () => void
}

interface DrawerSubjectListProps {
  pathname: string
  years: MobileShellDrawerYear[]
  onClose: () => void
}

interface DrawerYearListProps {
  currentYearSlug?: string
  years: MobileShellDrawerYear[]
  onClose: () => void
}

interface DrawerFooterProps {
  pathname: string
  onClose: () => void
}

interface DrawerUtilityLinkProps {
  href: string
  label: string
  eyebrow: string
  Icon: LucideIcon
  active: boolean
  onClose: () => void
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
  const pathname = usePathname()
  const { prefs } = usePreferences()
  const yearsWithFilteredSubjects = useVisibleDrawerYears(drawerYears, prefs)
  const totalVisibleSubjects = countVisibleSubjects(yearsWithFilteredSubjects)
  const isSubjectsView = totalVisibleSubjects < SUBJECTS_VIEW_THRESHOLD
  const { open, openDrawer, closeDrawer } = useDrawer(pathname)

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <MobileTopbar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        onOpenMenu={openDrawer}
      />
      <MobileDrawer
        open={open}
        onClose={closeDrawer}
        careerName={careerName}
        currentYearSlug={currentYearSlug}
        isSubjectsView={isSubjectsView}
        pathname={pathname}
        years={yearsWithFilteredSubjects}
      />
      <main className={cn('pb-12 pt-14', mainClassName)}>{children}</main>
    </div>
  )
}

function useDrawer(pathname: string): UseDrawerResult {
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, pathname })
  const open = drawer.open && drawer.pathname === pathname
  const openRef = useRef(open)

  useEffect(() => {
    openRef.current = open
  }, [open])

  const openDrawer = useCallback(() => setDrawer({ open: true, pathname }), [pathname])
  const closeDrawer = useCallback(() => setDrawer({ open: false, pathname }), [pathname])

  useDrawerKeyboardLock(open, closeDrawer)
  useDrawerSwipeGestures(openRef, openDrawer, closeDrawer)

  return { open, openDrawer, closeDrawer }
}

function useDrawerKeyboardLock(open: boolean, closeDrawer: () => void) {
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
}

function useDrawerSwipeGestures(
  openRef: React.RefObject<boolean>,
  openDrawer: () => void,
  closeDrawer: () => void,
) {
  useEffect(() => {
    const gesture = createSwipeGestureTracker(openRef, openDrawer, closeDrawer)

    document.addEventListener('touchstart', gesture.handleTouchStart, { passive: true })
    document.addEventListener('touchmove', gesture.handleTouchMove, { passive: true })
    document.addEventListener('touchend', gesture.handleTouchEnd, { passive: true })
    document.addEventListener('touchcancel', gesture.handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', gesture.handleTouchStart)
      document.removeEventListener('touchmove', gesture.handleTouchMove)
      document.removeEventListener('touchend', gesture.handleTouchEnd)
      document.removeEventListener('touchcancel', gesture.handleTouchEnd)
    }
  }, [closeDrawer, openDrawer, openRef])
}

function createSwipeGestureTracker(
  openRef: React.RefObject<boolean>,
  openDrawer: () => void,
  closeDrawer: () => void,
) {
  let startX = 0
  let startY = 0
  let tracking = false
  let committed = false

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]

    if (!openRef.current && touch.clientX > SWIPE_EDGE_PX) return

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

    if (!committed && !shouldCommitSwipe(absX, absY)) {
      tracking = absX >= absY * SWIPE_AXIS_BIAS
      return
    }

    committed = true

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

  return { handleTouchStart, handleTouchMove, handleTouchEnd }
}

function shouldCommitSwipe(absX: number, absY: number): boolean {
  if (absX < 10 && absY < 10) return false
  return absX >= absY * SWIPE_AXIS_BIAS
}

function useVisibleDrawerYears(drawerYears: MobileShellDrawerYear[], prefs: UserPreferences | null) {
  return useMemo(
    () =>
      drawerYears.reduce<MobileShellDrawerYear[]>((acc, year) => {
        if (!isYearVisible(year.slug, prefs)) return acc

        const subjects = (year.subjects ?? []).filter((subject) =>
          isSubjectVisible(year.slug, subject.slug, prefs),
        )
        acc.push({ ...year, subjects })
        return acc
      }, []),
    [drawerYears, prefs],
  )
}

function countVisibleSubjects(years: MobileShellDrawerYear[]) {
  return years.reduce((sum, year) => sum + (year.subjects?.length ?? 0), 0)
}

function MobileTopbar({ title, subtitle, onBack, onOpenMenu }: MobileTopbarProps) {
  const { push, back } = useRouter()
  const handleLeadingAction = onBack
    ? typeof onBack === 'string'
      ? () => push(onBack)
      : () => back()
    : onOpenMenu

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-white/5 bg-[rgba(20,20,20,0.92)] backdrop-blur-[14px] backdrop-saturate-[1.8]">
      <div className="flex h-full items-center justify-between px-3">
        <button
          type="button"
          aria-label={onBack ? 'Volver' : 'Abrir menú'}
          onClick={handleLeadingAction}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          {onBack ? <ChevronLeft size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2} />}
        </button>

        <Link href="/" className="mx-3 flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
          <Image
            src="/mascot-icon.svg"
            alt=""
            aria-hidden
            width={30}
            height={30}
            className="size-[30px] shrink-0"
          />
          <div className="flex min-w-0 flex-col">
            {title && <span className="truncate text-sm font-bold leading-tight text-white">{title}</span>}
            {subtitle && (
              <span className="truncate text-[9px] font-bold uppercase leading-tight tracking-[0.18em] text-white/40">
                {subtitle}
              </span>
            )}
          </div>
        </Link>

        <div className="size-10 shrink-0" aria-hidden />
      </div>
    </header>
  )
}

function MobileDrawer({
  open,
  onClose,
  careerName,
  currentYearSlug,
  isSubjectsView,
  pathname,
  years,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDialogElement>(null)
  const closeDrawer = useEffectEvent(() => {
    onClose()
  })

  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer) return

    const closeFromNativeEvent = (event: Event) => {
      event.preventDefault()
      closeDrawer()
    }
    const closeFromBackdrop = (event: globalThis.MouseEvent) => {
      if (event.target === drawer) closeDrawer()
    }

    if (open && !drawer.open) drawer.showModal()
    if (!open && drawer.open) drawer.close()

    drawer.addEventListener('cancel', closeFromNativeEvent)
    drawer.addEventListener('click', closeFromBackdrop)

    return () => {
      drawer.removeEventListener('cancel', closeFromNativeEvent)
      drawer.removeEventListener('click', closeFromBackdrop)
    }
  }, [open])

  return (
    <dialog
      ref={drawerRef}
      aria-label="Menú principal"
      className={cn(
        'fixed inset-y-0 left-0 z-[70] m-0 flex h-full w-[304px] max-h-none max-w-none flex-col border-r border-white/[0.06] bg-[#141414] p-0 text-white shadow-[24px_0_60px_rgba(0,0,0,0.5)] backdrop:bg-black/60',
        'transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <DrawerHeader careerName={careerName} onClose={onClose} />
      <DrawerNavigation
        isSubjectsView={isSubjectsView}
        pathname={pathname}
        currentYearSlug={currentYearSlug}
        years={years}
        onClose={onClose}
      />
      <DrawerFooter pathname={pathname} onClose={onClose} />
    </dialog>
  )
}

function DrawerHeader({ careerName, onClose }: { careerName: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-white/5 px-5 pb-4 pt-5">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          CARRERA
        </span>
        <span className="text-[17px] font-black leading-snug text-white">{careerName}</span>
      </div>
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="mt-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
      >
        <X size={18} strokeWidth={2} />
      </button>
    </div>
  )
}

function DrawerNavigation({
  isSubjectsView,
  pathname,
  currentYearSlug,
  years,
  onClose,
}: DrawerNavigationProps) {
  return (
    <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-4">
      <span className="mb-2 block px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        {isSubjectsView ? 'MATERIAS' : 'AÑOS ACADÉMICOS'}
      </span>
      {isSubjectsView ? (
        <DrawerSubjectList pathname={pathname} years={years} onClose={onClose} />
      ) : (
        <DrawerYearList currentYearSlug={currentYearSlug} years={years} onClose={onClose} />
      )}
    </nav>
  )
}

function DrawerSubjectList({ pathname, years, onClose }: DrawerSubjectListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {years.map((year) => (
        <DrawerSubjectGroup key={year.slug} pathname={pathname} year={year} onClose={onClose} />
      ))}
    </ul>
  )
}

function DrawerSubjectGroup({
  pathname,
  year,
  onClose,
}: {
  pathname: string
  year: MobileShellDrawerYear
  onClose: () => void
}) {
  const subjects = year.subjects ?? []
  if (subjects.length === 0) return null

  return (
    <>
      <li className="px-3 pb-1 pt-3 first:pt-0">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
          {year.nombre}
        </span>
      </li>
      {subjects.map((subject, subjectIndex) => (
        <DrawerSubjectLink
          key={subject.id}
          pathname={pathname}
          subject={subject}
          subjectIndex={subjectIndex}
          year={year}
          onClose={onClose}
        />
      ))}
    </>
  )
}

function DrawerSubjectLink({
  pathname,
  subject,
  subjectIndex,
  year,
  onClose,
}: {
  pathname: string
  subject: MobileShellDrawerSubject
  subjectIndex: number
  year: MobileShellDrawerYear
  onClose: () => void
}) {
  const colors = getYearColorClasses({ slug: year.slug, color: year.color })
  const href = `/${year.slug}/${subject.slug}`
  const isActive = pathname === href

  return (
    <li>
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
          isActive ? 'bg-white/5' : 'hover:bg-white/5',
        )}
      >
        <div
          className={cn(
            'flex size-[34px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white',
            colors.badgeClassName,
          )}
          style={colors.style}
        >
          <span className="text-[13px] font-black leading-none">{subjectIndex + 1}</span>
        </div>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold leading-tight text-white">{subject.nombre}</span>
        </span>
        <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-white/30" />
      </Link>
    </li>
  )
}

function DrawerYearList({ currentYearSlug, years, onClose }: DrawerYearListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {years.map((year) => (
        <DrawerYearLink
          key={year.slug}
          currentYearSlug={currentYearSlug}
          year={year}
          onClose={onClose}
        />
      ))}
    </ul>
  )
}

function DrawerYearLink({
  currentYearSlug,
  year,
  onClose,
}: {
  currentYearSlug?: string
  year: MobileShellDrawerYear
  onClose: () => void
}) {
  const colorClasses = getYearColorClasses({ slug: year.slug, color: year.color })
  const isActive = year.slug === currentYearSlug
  const subjectsCount = year.subjects?.length ?? 0

  return (
    <li>
      <Link
        href={`/${year.slug}`}
        onClick={onClose}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
          isActive ? 'bg-white/5' : 'hover:bg-white/5',
        )}
      >
        <div
          className={cn(
            'flex size-[34px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br',
            colorClasses.badgeClassName,
          )}
          style={colorClasses.style}
        >
          <span className="text-[13px] font-black leading-none">{year.orden}</span>
        </div>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold leading-tight text-white">{year.nombre}</span>
          <span className="mt-0.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em] text-white/40">
            {subjectsCount} {subjectsCount === 1 ? 'materia' : 'materias'}
          </span>
        </span>
        <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-white/30" />
      </Link>
    </li>
  )
}

function DrawerFooter({ pathname, onClose }: DrawerFooterProps) {
  return (
    <div className="border-t border-white/5 p-3">
      <div className="mb-3 flex flex-col gap-1">
        <DrawerUtilityLink
          href="/admin"
          label="Administración"
          eyebrow="Tu cuenta"
          Icon={Shield}
          active={pathname.startsWith('/admin')}
          onClose={onClose}
        />
        <DrawerUtilityLink
          href="/configurar"
          label="Configurar"
          eyebrow="Preferencias"
          Icon={SlidersHorizontal}
          active={pathname.startsWith('/configurar')}
          onClose={onClose}
        />
      </div>
      <MapaDrawerLink active={pathname.startsWith('/mapa')} onClose={onClose} />
      <DrawerBrandFooter />
    </div>
  )
}

function DrawerUtilityLink({ href, label, eyebrow, Icon, active, onClose }: DrawerUtilityLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
        active ? 'bg-white/5' : 'hover:bg-white/5',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-white/70">
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold leading-tight text-white">{label}</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em] text-white/40">
          {eyebrow}
        </span>
      </span>
      <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-white/30" />
    </Link>
  )
}

function MapaDrawerLink({ active, onClose }: { active: boolean; onClose: () => void }) {
  return (
    <Link
      href="/mapa"
      onClick={onClose}
      className={cn(
        'group flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all',
        active
          ? 'border-amber-400/35 bg-amber-400/10'
          : 'border-amber-400/15 bg-gradient-to-r from-amber-500/10 to-orange-500/5 hover:border-amber-400/30 hover:bg-amber-500/12',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.18)]">
          <Map size={16} strokeWidth={2.2} />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-bold leading-tight text-white">Mapa de correlativas</span>
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
  )
}

function DrawerBrandFooter() {
  return (
    <div className="mt-3 flex items-center justify-between px-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
        FCYT · UADER
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
        v alpha
      </span>
    </div>
  )
}
