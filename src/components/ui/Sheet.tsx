'use client'

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  titleId?: string
  children: ReactNode
  className?: string
}

export function Sheet({
  open,
  onClose,
  title,
  titleId = 'sheet-title',
  children,
  className,
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(handle)
  }, [])

  // Lock scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Focus trap: keep focus inside the sheet
  useEffect(() => {
    if (!open || !sheetRef.current) return
    const el = sheetRef.current

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first?.focus()

    function trapFocus(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [open])

  if (!open || !mounted) return null

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleOverlayKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      onClose()
    }
  }

  return createPortal(
    /* Overlay */
    <div
      className="sheet-overlay fixed inset-0 z-50 flex flex-col justify-end sm:flex-row sm:justify-end bg-black/70 backdrop-blur-sm"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKey}
      role="presentation"
    >
      {/* Sheet Panel */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'sheet-panel relative h-auto max-h-[92vh] sm:h-full sm:max-h-none w-full max-w-md border-t sm:border-t-0 border-l-0 sm:border-l border-white/8 bg-surface-1 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between rounded-t-2xl sm:rounded-none',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-6 py-5">
          <h2
            id={titleId}
            className="text-lg font-black tracking-tight text-white font-display"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="inline-flex h-8 w-8 items-center justify-center text-white/46 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
