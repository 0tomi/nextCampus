'use client'

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** Stable ID used for aria-labelledby — defaults to "modal-title" */
  titleId?: string
  children: ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  titleId = 'modal-title',
  children,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

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

  // Focus trap: keep focus inside the dialog
  useEffect(() => {
    if (!open || !dialogRef.current) return
    const el = dialogRef.current

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

  if (!open) return null

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleOverlayKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') onClose()
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKey}
      role="presentation"
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative w-full max-w-lg rounded-none border border-white/8 bg-surface-1 shadow-[0_24px_64px_rgba(0,0,0,0.72)] animate-in',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-6 py-4">
          <h2
            id={titleId}
            className="text-base font-black tracking-tight text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center text-white/46 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
