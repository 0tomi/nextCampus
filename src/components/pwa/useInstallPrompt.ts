'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'nextcampus:pwa-install-status'

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
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [isReady, setIsReady] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const installed = readInstalledStatus()
    setIsInstalled(detectStandalone() || installed)
    setIsIOS(detectIOS())
    setIsReady(true)

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

  const canPromptNatively = Boolean(deferred)
  const shouldShow = isReady && !isInstalled

  return {
    isReady,
    shouldShow,
    isIOS,
    canPromptNatively,
    promptInstall,
  }
}
