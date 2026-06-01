'use client'

import { useEffect, useRef } from 'react'

export function useExamTimer({
  enabled,
  timeLeft,
  onExpire,
  onTick,
}: {
  enabled: boolean
  timeLeft: number | null
  onExpire: () => void
  onTick: () => void
}) {
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!enabled || timeLeft === null) return

    if (timeLeft <= 0) {
      onExpireRef.current()
      return
    }

    const timer = setTimeout(onTick, 1000)
    return () => clearTimeout(timer)
  }, [enabled, timeLeft, onTick])
}
