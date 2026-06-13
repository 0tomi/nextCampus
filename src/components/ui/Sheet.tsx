'use client'

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
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
  const sheetRef = useRef<HTMLDialogElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(handle)
  }, [])

  const closeSheet = useEffectEvent(() => {
    onClose()
  })

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !open) return

    const closeFromNativeEvent = (event: Event) => {
      event.preventDefault()
      closeSheet()
    }
    const closeFromBackdrop = (event: globalThis.MouseEvent) => {
      if (event.target === sheet) closeSheet()
    }

    if (!sheet.open) sheet.showModal()
    sheet.addEventListener('cancel', closeFromNativeEvent)
    sheet.addEventListener('click', closeFromBackdrop)

    return () => {
      sheet.removeEventListener('cancel', closeFromNativeEvent)
      sheet.removeEventListener('click', closeFromBackdrop)
      if (sheet.open) sheet.close()
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

  // Mantener el <dialog> montado mientras el componente viva (no desmontar al
  // cerrar) para que la animación de SALIDA tenga un nodo sobre el cual correr.
  // El estado abierto/cerrado lo maneja el atributo [open] (showModal/close) +
  // CSS con @starting-style y allow-discrete.
  if (!mounted) return null


  return createPortal(
    <dialog
      ref={sheetRef}
      aria-labelledby={titleId}
      className={cn(
        'sheet-dialog fixed inset-x-0 bottom-0 top-auto m-0 ml-auto h-auto max-h-[92vh] w-full max-w-md flex-col justify-between rounded-t-2xl border-l-0 border-t border-white/8 bg-surface-1 p-0 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0',
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
          className="inline-flex size-11 items-center justify-center rounded-lg text-white/46 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </dialog>,
    document.body,
  )
}
