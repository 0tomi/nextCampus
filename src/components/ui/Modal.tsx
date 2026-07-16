'use client'

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
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

    // Cuando el gesto del mouse arranca DENTRO del contenido (por ejemplo, al
    // subrayar texto) y se suelta sobre el fondo, el `click` resuelve su target
    // al <dialog>. Para no cerrar en ese caso, solo cerramos cuando el gesto
    // arranca Y termina sobre el fondo.
    let pressStartedOnBackdrop = false

    const closeFromNativeEvent = (event: Event) => {
      event.preventDefault()
      closeDialog()
    }
    const trackPressOrigin = (event: globalThis.MouseEvent) => {
      pressStartedOnBackdrop = event.target === dialog
    }
    const closeFromBackdrop = (event: globalThis.MouseEvent) => {
      if (event.target === dialog && pressStartedOnBackdrop) closeDialog()
      pressStartedOnBackdrop = false
    }

    if (!dialog.open) dialog.showModal()
    dialog.addEventListener('cancel', closeFromNativeEvent)
    dialog.addEventListener('mousedown', trackPressOrigin)
    dialog.addEventListener('click', closeFromBackdrop)

    return () => {
      dialog.removeEventListener('cancel', closeFromNativeEvent)
      dialog.removeEventListener('mousedown', trackPressOrigin)
      dialog.removeEventListener('click', closeFromBackdrop)
      if (dialog.open) dialog.close()
    }
  }, [open, mounted])

  // Lock scroll while open. Native <dialog> owns focus trapping and Escape.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!mounted) return null


  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        'modal-dialog m-auto flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-none border border-white/8 bg-surface-1 p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.72)] md:w-full',
        className,
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/6 px-6 py-4">
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
      <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 scrollbar-none', contentClassName)}>{children}</div>
    </dialog>,
    document.body,
  )
}
