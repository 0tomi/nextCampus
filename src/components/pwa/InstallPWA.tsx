'use client'

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { Download, Share, Plus, X, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInstallPrompt } from './useInstallPrompt'

function IosInstructionsSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const closeDialog = useEffectEvent(() => {
    onClose()
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

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
  }, [])


  return (
    <dialog
      ref={dialogRef}
      aria-label="Instalar en iPhone"
      className="fixed inset-x-4 bottom-6 top-auto z-[110] mx-auto max-w-md rounded-xl border border-white/10 bg-surface-1 p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:inset-x-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            Instalar en iPhone
          </span>
          <h3 className="text-lg font-bold text-white">
            Agregala a tu pantalla de inicio
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      <ol className="mt-4 flex flex-col gap-3">
        <li className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-white/70">
            <Share size={15} strokeWidth={2} />
          </span>
          <div className="flex flex-col gap-0.5 pt-1">
            <span className="text-[13px] font-semibold text-white">
              Tocá el botón Compartir
            </span>
            <span className="text-[12px] text-white/55">
              Está en la barra inferior de Safari.
            </span>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-white/70">
            <Plus size={15} strokeWidth={2} />
          </span>
          <div className="flex flex-col gap-0.5 pt-1">
            <span className="text-[13px] font-semibold text-white">
              Elegí “Añadir a pantalla de inicio”
            </span>
            <span className="text-[12px] text-white/55">
              Confirmá el nombre y listo, ya la tenés.
            </span>
          </div>
        </li>
      </ol>

      <p className="mt-4 text-[11px] text-white/40">
        Funciona en Safari. Si estás en Chrome para iPhone, abrila primero en
        Safari.
      </p>
    </dialog>
  )
}

function useInstallAction() {
  const state = useInstallPrompt()
  const [showIos, setShowIos] = useState(false)

  const onClick = async () => {
    if (state.canPromptNatively) {
      await state.promptInstall()
      return
    }
    if (state.isIOS) {
      setShowIos(true)
    }
  }

  const closeIos = () => {
    setShowIos(false)
  }

  return {
    visible: state.shouldShow,
    isIOS: state.isIOS,
    onClick,
    onDismiss: state.dismiss,
    showIos,
    closeIos,
  }
}

export function InstallPWATopbarButton() {
  const action = useInstallAction()

  if (!action.visible) {
    return <div className="size-10" aria-hidden />
  }

  return (
    <>
      <button
        type="button"
        aria-label="Instalar app"
        onClick={action.onClick}
        className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-primary/35 bg-primary/12 text-white transition-colors hover:border-primary/55 hover:bg-primary/20"
      >
        <Download size={17} strokeWidth={2.3} />
      </button>
      {action.showIos && <IosInstructionsSheet onClose={action.closeIos} />}
    </>
  )
}

export function InstallPWAHeroButton() {
  const action = useInstallAction()

  if (!action.visible) {
    return null
  }

  return (
    <>
      <button
        type="button"
        aria-label="Instalar app"
        onClick={action.onClick}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-2 text-sm font-bold text-black shadow-[0_0_22px_rgba(251,191,36,0.25)] transition-colors hover:from-amber-300 hover:to-orange-400"
      >
        <Download size={16} strokeWidth={2.5} />
        Instalar App
      </button>
      {action.showIos && <IosInstructionsSheet onClose={action.closeIos} />}
    </>
  )
}

interface InstallPWASettingsCardProps {
  className?: string
}

export function InstallPWASettingsCard({ className }: InstallPWASettingsCardProps): ReactNode {
  const action = useInstallAction()

  if (!action.visible) return null

  return (
    <>
      <section
        className={cn(
          'overflow-hidden rounded-md border border-white/5 bg-surface-1',
          className,
        )}
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-dark text-white shadow-[0_0_18px_rgba(204,0,0,0.28)]">
              <Smartphone size={20} strokeWidth={2.2} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
                Aplicación
              </p>
              <h3 className="text-base font-bold text-white">
                Tené el campus en tu pantalla de inicio
              </h3>
              <p className="text-[13px] text-white/55">
                Se abre como app, sin barras del navegador y con su propio
                ícono.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch md:flex-row">
            <button
              type="button"
              onClick={action.onDismiss}
              className="cursor-pointer rounded-md border border-white/10 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              <Download size={15} strokeWidth={2.5} />
              Instalar app
            </button>
          </div>
        </div>
      </section>
      {action.showIos && <IosInstructionsSheet onClose={action.closeIos} />}
    </>
  )
}
