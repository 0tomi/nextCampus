import { todayKeyAR } from '@/lib/utils'

// Argentina uses UTC-3 without DST. Recompute the named-zone day after every
// wake-up so a suspended tab or a changed device clock never counts stale ticks.
export function startArgentinaDayClock(onDay: (day: string) => void) {
  let timer: ReturnType<typeof setTimeout>
  function refresh() {
    clearTimeout(timer)
    const today = todayKeyAR()
    onDay(today)
    const nextMidnight = Date.parse(`${today}T00:00:00-03:00`) + 86_400_000
    timer = setTimeout(refresh, Math.max(1, nextMidnight - Date.now()))
  }
  document.addEventListener('visibilitychange', refresh)
  window.addEventListener('focus', refresh)
  refresh()
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', refresh)
    window.removeEventListener('focus', refresh)
  }
}
