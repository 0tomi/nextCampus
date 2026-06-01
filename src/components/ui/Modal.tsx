'use client'

import { useEffect, useEffectEvent, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  contentClassName?: string
}

export function Modal({
  open,
  onClose,
  title,
  titleId = 'modal-title',
  children,
  className,
  contentClassName,
}: ModalProps) {
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
      aria-labelledby={titleId}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-lg overflow-visible rounded-none border border-white/8 bg-surface-1 p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.72)] backdrop:bg-black/70 backdrop:backdrop-blur-sm animate-in md:w-full',
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
          className="inline-flex size-8 items-center justify-center text-white/46 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className={cn('px-6 py-5', contentClassName)}>{children}</div>
    </dialog>,
    document.body,
  )
}
