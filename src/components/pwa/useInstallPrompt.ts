'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'nextcampus:pwa-install-status'

type StoredStatus = 'dismissed' | 'installed'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function readStatus(): StoredStatus | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'dismissed' || raw === 'installed') return raw
    return null
  } catch {
    return null
  }
}

function writeStatus(status: StoredStatus) {
  try {
    window.localStorage.setItem(STORAGE_KEY, status)
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
    const stored = readStatus()
    setIsInstalled(detectStandalone() || stored === 'installed')
    setIsDismissed(stored === 'dismissed')
    setIsIOS(detectIOS())
    setIsReady(true)

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      writeStatus('installed')
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
        writeStatus('installed')
        setIsInstalled(true)
      } else {
        writeStatus('dismissed')
        setIsDismissed(true)
      }
    } finally {
      setDeferred(null)
    }
  }, [deferred])

  const dismiss = useCallback(() => {
    writeStatus('dismissed')
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
