'use client'

import { useEffect, useEffectEvent, useReducer, useRef } from 'react'
import { X, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RankingItem {
  position: number
  nombreUsuario: string
  eventosCreados: number
  apuntesCreados: number
  bancosPreguntasCreados: number
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

interface NosotrosModalProps {
  open: boolean
  onClose: () => void
}

const RANKING_SKELETON_KEYS = ['ranking-skeleton-1', 'ranking-skeleton-2', 'ranking-skeleton-3', 'ranking-skeleton-4', 'ranking-skeleton-5']

type ModalTransitionState = {
  mounted: boolean
  visible: boolean
  showRankingMobile: boolean
}

type ModalTransitionAction =
  | { type: 'mounted' }
  | { type: 'visible' }
  | { type: 'closing' }
  | { type: 'unmounted' }
  | { type: 'toggle-mobile-ranking' }

function modalTransitionReducer(state: ModalTransitionState, action: ModalTransitionAction): ModalTransitionState {
  switch (action.type) {
    case 'mounted':
      return { ...state, mounted: true }
    case 'visible':
      return { ...state, visible: true }
    case 'closing':
      return { ...state, showRankingMobile: false, visible: false }
    case 'unmounted':
      return { ...state, mounted: false }
    case 'toggle-mobile-ranking':
      return { ...state, showRankingMobile: !state.showRankingMobile }
  }
}

function useNosotrosModalTransition(open: boolean) {
  const [state, dispatch] = useReducer(modalTransitionReducer, {
    mounted: false,
    showRankingMobile: false,
    visible: false,
  })
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      const mountTimer = setTimeout(() => dispatch({ type: 'mounted' }), 0)
      const visibleTimer = setTimeout(() => dispatch({ type: 'visible' }), 20)
      return () => {
        clearTimeout(mountTimer)
        clearTimeout(visibleTimer)
      }
    }

    const hideTimer = setTimeout(() => dispatch({ type: 'closing' }), 0)
    closeTimerRef.current = setTimeout(() => dispatch({ type: 'unmounted' }), 300)
    return () => clearTimeout(hideTimer)
  }, [open])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  return {
    mounted: state.mounted,
    showRankingMobile: state.showRankingMobile,
    toggleRankingMobile: () => dispatch({ type: 'toggle-mobile-ranking' }),
    visible: state.visible,
  }
}

type RankingState = {
  items: RankingItem[]
  loading: boolean
}

type RankingAction =
  | { type: 'loading' }
  | { type: 'loaded'; items: RankingItem[] }
  | { type: 'failed' }

function rankingReducer(state: RankingState, action: RankingAction): RankingState {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true }
    case 'loaded':
      return { items: action.items, loading: false }
    case 'failed':
      return { items: [], loading: false }
  }
}

function useRankingData(open: boolean) {
  const [state, dispatch] = useReducer(rankingReducer, { items: [], loading: false })

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      dispatch({ type: 'loading' })
      fetch('/api/ranking', { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { items: [] }))
        .then((data: { items?: RankingItem[] }) => dispatch({ type: 'loaded', items: data.items ?? [] }))
        .catch((error) => {
          if ((error as Error).name !== 'AbortError') dispatch({ type: 'failed' })
        })
    }, 0)

    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [open])

  return state
}

export function NosotrosModal({ open, onClose }: NosotrosModalProps) {
  const { mounted, showRankingMobile, toggleRankingMobile, visible } = useNosotrosModalTransition(open)
  const { items: ranking, loading: rankingLoading } = useRankingData(open)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useBodyScrollLock(mounted)
  useNativeNosotrosDialog(mounted, dialogRef, onClose)

  if (!mounted) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm transition-opacity duration-300 ease-out',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      onClick={onClose}
      role="presentation"
    >
      <dialog
        ref={dialogRef}
        aria-labelledby="about-modal-title"
        className={cn(
          'relative m-0 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/8 bg-surface-1 p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.85)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop:bg-transparent',
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0',
        )}
      >
        <AboutModalGlow />
        <AboutModalHeader onClose={onClose} />
        <AboutModalContent
          ranking={ranking}
          rankingLoading={rankingLoading}
          showRankingMobile={showRankingMobile}
          onToggleRankingMobile={toggleRankingMobile}
        />
      </dialog>
    </div>
  )
}


function useNativeNosotrosDialog(
  mounted: boolean,
  dialogRef: React.RefObject<HTMLDialogElement | null>,
  onClose: () => void,
) {
  const closeDialog = useEffectEvent(() => {
    onClose()
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !mounted) return

    const closeFromNativeEvent = (event: Event) => {
      event.preventDefault()
      closeDialog()
    }
    const stopDialogClick = (event: globalThis.MouseEvent) => {
      event.stopPropagation()
    }

    if (!dialog.open) dialog.showModal()
    dialog.addEventListener('cancel', closeFromNativeEvent)
    dialog.addEventListener('click', stopDialogClick)

    return () => {
      dialog.removeEventListener('cancel', closeFromNativeEvent)
      dialog.removeEventListener('click', stopDialogClick)
      if (dialog.open) dialog.close()
    }
  }, [mounted])
}

function useBodyScrollLock(mounted: boolean) {
  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted])
}

function useEscapeToClose(visible: boolean, onClose: () => void) {
  useEffect(() => {
    if (!visible) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [visible, onClose])
}

function useFocusTrap(visible: boolean, dialogRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!visible || !dialogRef.current) return
    const el = dialogRef.current
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first?.focus()

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [visible, dialogRef])
}

function AboutModalGlow() {
  return (
    <>
      <div className="pointer-events-none absolute top-[-4rem] left-[-4rem] size-36 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-4rem] bottom-[-4rem] size-36 rounded-full bg-orange-500/10 blur-3xl" />
    </>
  )
}

function AboutModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative z-10 flex items-center justify-between border-b border-white/6 px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-black">
          <GraduationCap size={16} strokeWidth={2.5} />
        </div>
        <h2 id="about-modal-title" className="font-display text-base font-black tracking-tight text-white">
          Sobre nosotros
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function AboutModalContent({
  ranking,
  rankingLoading,
  showRankingMobile,
  onToggleRankingMobile,
}: {
  ranking: RankingItem[]
  rankingLoading: boolean
  showRankingMobile: boolean
  onToggleRankingMobile: () => void
}) {
  return (
    <div className="relative z-10 grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.82fr)]">
      <div className="space-y-5">
        <AboutText visibleOnMobile={!showRankingMobile} />
        {showRankingMobile ? <MobileRankingPanel ranking={ranking} rankingLoading={rankingLoading} /> : null}
        <DeveloperContacts />
        <MobileRankingToggle showRankingMobile={showRankingMobile} onToggle={onToggleRankingMobile} />
      </div>
      <DesktopRankingPanel ranking={ranking} rankingLoading={rankingLoading} />
    </div>
  )
}

function AboutText({ visibleOnMobile }: { visibleOnMobile: boolean }) {
  return (
    <div className={cn(visibleOnMobile ? 'block' : 'hidden', 'space-y-5 lg:block')}>
      <p className="text-sm leading-relaxed text-white/70">
        Somos estudiantes de la carrera de Licenciatura en Sistemas. Vimos que el campus no suple algunas necesidades
        que tenemos, por lo que decidimos actuar implementando nuestra propia visión de un campus universitario
        inteligente. En este campus podés encontrar diversas herramientas como un{' '}
        <strong className="font-bold text-white">Calendario</strong> con eventos por materia,{' '}
        <strong className="font-bold text-white">Quiz</strong> para autoevaluarse, y{' '}
        <strong className="font-bold text-white">Apuntes interactivos</strong>.
      </p>
      <p className="text-sm leading-relaxed text-white/70">
        Todo el código es libre y abierto. Podés encontrarlo y aportar en nuestro repositorio de GitHub.
      </p>
      <div className="pt-2">
        <a
          href="https://github.com/0tomi/nextCampus"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
        >
          <GithubIcon className="size-4" />
          Ver repositorio en GitHub
        </a>
      </div>
    </div>
  )
}

function MobileRankingPanel({ ranking, rankingLoading }: { ranking: RankingItem[]; rankingLoading: boolean }) {
  return (
    <div className="animate-in space-y-4 lg:hidden">
      <RankingHeader />
      <RankingList ranking={ranking} rankingLoading={rankingLoading} />
    </div>
  )
}

function DesktopRankingPanel({ ranking, rankingLoading }: { ranking: RankingItem[]; rankingLoading: boolean }) {
  return (
    <aside className="hidden lg:block lg:border-l lg:border-white/8 lg:pl-6">
      <RankingHeader />
      <div className="mt-4">
        <RankingList ranking={ranking} rankingLoading={rankingLoading} />
      </div>
    </aside>
  )
}

function RankingHeader() {
  return (
    <>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Comunidad</p>
      <h3 className="mt-2 font-display text-xl font-black tracking-tight text-white">Ranking de aportes</h3>
    </>
  )
}

function RankingList({ ranking, rankingLoading }: { ranking: RankingItem[]; rankingLoading: boolean }) {
  if (rankingLoading) {
    return (
      <div className="divide-y divide-white/5">
        {RANKING_SKELETON_KEYS.map((key) => (
          <div key={key} className="h-12 animate-pulse bg-white/[0.05] py-3 first:pt-0" />
        ))}
      </div>
    )
  }

  if (ranking.length === 0) {
    return (
      <p className="py-5 text-center text-sm leading-6 text-white/45">
        Todavía no hay aportes suficientes para armar el ranking.
      </p>
    )
  }

  return (
    <div className="divide-y divide-white/5">
      {ranking.map((item) => (
        <div key={item.position} className="py-3 first:pt-0">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-bold text-white">
              {item.position}. {item.nombreUsuario}
            </p>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-white/45">
            {item.eventosCreados} eventos · {item.apuntesCreados} apuntes · {item.bancosPreguntasCreados} quiz
          </p>
        </div>
      ))}
    </div>
  )
}

function DeveloperContacts() {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Redes de los desarrolladores</p>
      <div className="flex flex-wrap gap-2">
        <DeveloperLink href="https://instagram.com/tomischl" label="@tomischl" />
        <DeveloperLink href="https://instagram.com/tomygiorgi" label="@tomygiorgi" />
      </div>
    </div>
  )
}

function DeveloperLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
    >
      <InstagramIcon className="size-3.5" />
      {label}
    </a>
  )
}

function MobileRankingToggle({ showRankingMobile, onToggle }: { showRankingMobile: boolean; onToggle: () => void }) {
  return (
    <div className="pt-2 lg:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
      >
        {showRankingMobile ? 'Sobre nosotros' : 'Contribuidores'}
      </button>
    </div>
  )
}
