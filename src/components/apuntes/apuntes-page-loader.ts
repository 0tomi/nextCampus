import type { ApunteFeedItem } from './ApuntesFeed'

interface ApuntesPage {
  items: ApunteFeedItem[]
  hasMore: boolean
  nextCursor: string | null
}

export function createApuntesPageLoader(callbacks: {
  onStart: (retrying: boolean) => void
  onSuccess: (page: ApuntesPage, reset: boolean) => void
  onError: () => void
}) {
  let generation = 0
  let active: AbortController | null = null
  let failed: { url: string; reset: boolean } | null = null

  const cancel = () => {
    generation += 1
    active?.abort()
    active = null
    failed = null
  }

  const load = async (url: string, reset: boolean, retrying = false) => {
    // Observer notifications can repeat before React commits the loading state.
    if (!reset && (active || (failed && !retrying))) return
    cancel()
    const requestGeneration = generation
    const controller = new AbortController()
    active = controller
    const isCurrent = () =>
      generation === requestGeneration && !controller.signal.aborted

    callbacks.onStart(retrying)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!isCurrent()) return
      if (!response.ok) throw new Error('No se pudieron cargar los apuntes.')
      const page = (await response.json()) as ApuntesPage
      // Aborting alone is insufficient once response parsing is already pending.
      if (isCurrent()) callbacks.onSuccess(page, reset)
    } catch {
      if (isCurrent()) {
        failed = { url, reset }
        callbacks.onError()
      }
    } finally {
      if (isCurrent()) active = null
    }
  }

  const retry = () => {
    if (active || !failed) return
    const { url, reset } = failed
    return load(url, reset, true)
  }

  return { load, cancel, retry }
}
