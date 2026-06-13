'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'nextcampus:pwa-install-status'
const SESSION_STORAGE_KEY = 'nextcampus:pwa-dismissed'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function readInstalledStatus(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'installed'
  } catch {
    return false
  }
}

function writeInstalledStatus() {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'installed')
  } catch {}
}

function readDismissedStatus(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) === 'dismissed'
  } catch {
    return false
  }
}

function writeDismissedStatus() {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, 'dismissed')
  } catch {}
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua)
  const isMacWithTouch =
    /Mac/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document
  return isIOSDevice || isMacWithTouch
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches
  const iosStandalone =
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return Boolean(mediaStandalone || iosStandalone)
}

export interface UseInstallPromptResult {
  isReady: boolean
  shouldShow: boolean
  isIOS: boolean
  canPromptNatively: boolean
  promptInstall: () => Promise<void>
  dismiss: () => void
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [isReady, setIsReady] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const installed = readInstalledStatus()
    const dismissed = readDismissedStatus()
    // Estado disponible solo en el cliente (localStorage, matchMedia, user-agent).
    // Se inicializa tras el montaje a propósito: `isReady` arranca en false en
    // server y cliente, así no hay mismatch de hidratación. El set sincrónico acá
    // es intencional, no una cascada de renders accidental.
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsInstalled(detectStandalone() || installed)
    setIsDismissed(dismissed)
    setIsIOS(detectIOS())
    setIsReady(true)
    /* eslint-enable react-hooks/set-state-in-effect */

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      writeInstalledStatus()
      setIsInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        writeInstalledStatus()
        setIsInstalled(true)
      }
    } finally {
      setDeferred(null)
    }
  }, [deferred])

  const dismiss = useCallback(() => {
    writeDismissedStatus()
    setIsDismissed(true)
  }, [])

  const canPromptNatively = Boolean(deferred)
  const shouldShow =
    isReady && !isInstalled && !isDismissed && (canPromptNatively || isIOS)

  return {
    isReady,
    shouldShow,
    isIOS,
    canPromptNatively,
    promptInstall,
    dismiss,
  }
}
