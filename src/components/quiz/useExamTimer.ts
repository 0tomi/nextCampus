'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

// Timer callbacks can be delayed while a tab is suspended: the deadline, not
// the number of callbacks, is authoritative. Resume events refresh immediately.
export function startExamCountdown(deadline: number, onTick: (seconds: number) => void, onExpire: () => void) {
  let expired = false
  let timer: ReturnType<typeof setTimeout> | undefined

  function update() {
    if (expired) return
    clearTimeout(timer)
    const remainingMs = deadline - Date.now()
    const seconds = Math.max(0, Math.ceil(remainingMs / 1000))
    onTick(seconds)
    if (seconds === 0) {
      expired = true
      onExpire()
      return
    }
    timer = setTimeout(update, Math.min(1000, remainingMs))
  }

  document.addEventListener('visibilitychange', update)
  window.addEventListener('focus', update)
  update()
  return () => {
    expired = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', update)
    window.removeEventListener('focus', update)
  }
}

export function useExamTimer({
  enabled,
  deadline,
  onExpire,
  onTick,
}: {
  enabled: boolean
  deadline: number | null
  onExpire: () => void
  onTick: (seconds: number, deadline: number) => void
}) {
  const expiredDeadline = useRef<number | null>(null)
  const tick = useEffectEvent((seconds: number, activeDeadline: number) => onTick(seconds, activeDeadline))
  const expire = useEffectEvent((activeDeadline: number) => {
    // Keep the latch across effect replays and request/loading transitions.
    if (expiredDeadline.current === activeDeadline) return
    expiredDeadline.current = activeDeadline
    onExpire()
  })

  useEffect(() => {
    if (!enabled || deadline === null) return
    return startExamCountdown(deadline, (seconds) => tick(seconds, deadline), () => expire(deadline))
  }, [enabled, deadline])
}
