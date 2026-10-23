export type RankedTiming = { elapsedAtSyncMs: number; syncedAtMs: number }

export function elapsedSeconds(timing: RankedTiming) {
  return Math.max(0, Math.floor((timing.elapsedAtSyncMs + Date.now() - timing.syncedAtMs) / 1000))
}

// A display-only clock: the server remains responsible for duration validation.
// Refresh from the time anchor after suspension, rather than counting callbacks.
export function startRankedClock(timing: RankedTiming, onTick: (seconds: number) => void) {
  const update = () => onTick(elapsedSeconds(timing))
  const timer = setInterval(update, 1000)
  document.addEventListener('visibilitychange', update)
  window.addEventListener('focus', update)
  update()
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', update)
    window.removeEventListener('focus', update)
  }
}
