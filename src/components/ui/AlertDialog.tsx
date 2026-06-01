'use client'

import { useEffect, useEffectEvent, useRef, useState, type MouseEvent } from 'react'
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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(handle)
  }, [])

  const closeDialog = useEffectEvent(() => {
    onClose()
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !open) return

    const closeFromNativeEvent = (event: Event) => {
      event.preventDefault()
      closeDialog()
    }
    const closeFromBackdrop = (event: globalThis.MouseEvent) => {
      if (event.target === dialog) closeDialog()
    }

    if (!dialog.open) dialog.showModal()
    dialog.addEventListener('cancel', closeFromNativeEvent)
    dialog.addEventListener('click', closeFromBackdrop)

    return () => {
      dialog.removeEventListener('cancel', closeFromNativeEvent)
      dialog.removeEventListener('click', closeFromBackdrop)
      if (dialog.open) dialog.close()
    }
  }, [open])

  // Lock scroll while open. Native <dialog> owns focus trapping and Escape.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !mounted) return null


  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      className="m-auto w-[calc(100%-2rem)] max-w-md border border-white/10 bg-surface-1 p-6 text-white shadow-[0_24px_64px_rgba(0,0,0,0.8)] backdrop:bg-black/80 backdrop:backdrop-blur-sm animate-in md:w-full"
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
    </dialog>,
    document.body,
  )
}
