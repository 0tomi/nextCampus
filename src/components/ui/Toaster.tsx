'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toaster global de la app. Alineado al sistema visual: superficie `surface-1`,
 * borde fino `white/8`, esquinas rectas y sombra difusa profunda como los
 * modales. Verde sutil para el éxito, rosa para el error.
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            'group !rounded-none !border !border-white/8 !bg-surface-1 !text-white !shadow-[0_24px_64px_rgba(0,0,0,0.72)] !font-sans',
          title: '!text-sm !font-semibold !text-white',
          description: '!text-xs !text-white/55',
          success: '!border-emerald-400/25',
          error: '!border-rose-400/30 !text-rose-100',
          icon: 'group-data-[type=success]:!text-emerald-400 group-data-[type=error]:!text-rose-400',
          actionButton:
            '!rounded !bg-white !text-black !text-xs !font-semibold',
          closeButton:
            '!bg-surface-1 !border-white/10 !text-white/60 hover:!text-white',
        },
      }}
    />
  )
}
