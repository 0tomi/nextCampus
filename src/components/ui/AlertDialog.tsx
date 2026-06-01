'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface AlertDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  cancelText?: string
  confirmText?: string
  variant?: 'default' | 'destructive'
}

export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  cancelText = 'Cancelar',
  confirmText = 'Continuar',
  variant = 'default',
}: AlertDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  // Focus trap: keep focus inside the dialog
  useEffect(() => {
    if (!open || !dialogRef.current) return
    const el = dialogRef.current

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [tabindex]:not([tabindex="-1"])',
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

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className="relative w-full max-w-md border border-white/10 bg-surface-1 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8)] animate-in"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="alert-dialog-title"
            className="font-display text-lg font-black tracking-tight text-white"
          >
            {title}
          </h2>
          <p
            id="alert-dialog-description"
            className="text-sm leading-relaxed text-white/60"
          >
            {description}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center border border-white/8 bg-surface-3 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:border-white/15 hover:text-white cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'inline-flex justify-center px-4 py-2 text-sm font-bold text-white transition-colors cursor-pointer',
              variant === 'destructive'
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-primary hover:bg-primary-light',
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
