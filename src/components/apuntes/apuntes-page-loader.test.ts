import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApuntesPageLoader } from './apuntes-page-loader'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function page(id: string) {
  return { items: [], hasMore: true, nextCursor: id }
}

function setup() {
  const requests: Array<{
    url: string
    signal: AbortSignal
    response: ReturnType<typeof deferred<Response>>
  }> = []
  vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
    const response = deferred<Response>()
    requests.push({ url, signal: options.signal as AbortSignal, response })
    // Deliberately ignore aborts to verify identity independently of cancellation.
    return response.promise
  }))
  const callbacks = { onStart: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() }
  return { loader: createApuntesPageLoader(callbacks), requests, ...callbacks }
}

function respond(request: ReturnType<typeof setup>['requests'][number], id: string) {
  request.response.resolve({ ok: true, json: async () => page(id) } as Response)
}

afterEach(() => vi.unstubAllGlobals())

describe('apuntes request ownership', () => {
  it('aborts obsolete filters and accepts only the latest rapid toggle, including Todos', async () => {
    const { loader, requests, onSuccess, onError } = setup()
    const first = loader.load('/api/apuntes?categoria=a', true)
    const second = loader.load('/api/apuntes?categoria=b', true)
    const all = loader.load('/api/apuntes', true)
    expect(requests[0].signal.aborted).toBe(true)
    expect(requests[1].signal.aborted).toBe(true)
    respond(requests[2], 'all')
    await all
    respond(requests[1], 'b')
    respond(requests[0], 'a')
    await Promise.all([first, second])
    expect(onSuccess.mock.calls).toEqual([[page('all'), true]])
    expect(onError).not.toHaveBeenCalled()
  })

  it('rejects a stale body even when the obsolete fetch already resolved', async () => {
    const { loader, requests, onSuccess } = setup()
    const body = deferred<ReturnType<typeof page>>()
    const first = loader.load('/api/apuntes?categoria=a', true)
    const json = vi.fn(() => body.promise)
    requests[0].response.resolve({ ok: true, json } as unknown as Response)
    await Promise.resolve()
    expect(json).toHaveBeenCalledOnce()
    const second = loader.load('/api/apuntes?categoria=b', true)
    respond(requests[1], 'b')
    await second
    body.resolve(page('a'))
    await first
    expect(onSuccess.mock.calls).toEqual([[page('b'), true]])
  })

  it('deduplicates observer pagination and prevents an old page appending after a filter reset', async () => {
    const { loader, requests, onStart, onSuccess } = setup()
    const oldPage = loader.load('/api/apuntes?cursor=old', false)
    await loader.load('/api/apuntes?cursor=old', false)
    expect(requests).toHaveLength(1)
    const reset = loader.load('/api/apuntes?categoria=new', true)
    expect(requests[0].signal.aborted).toBe(true)
    respond(requests[0], 'old')
    await oldPage
    // An obsolete finally must not clear ownership of the pending reset.
    await loader.load('/api/apuntes?cursor=old', false)
    expect(requests).toHaveLength(2)
    respond(requests[1], 'new')
    await reset
    const next = loader.load('/api/apuntes?categoria=new&cursor=new', false)
    respond(requests[2], 'next')
    await next
    expect(onStart).toHaveBeenCalledTimes(3)
    expect(onSuccess.mock.calls).toEqual([[page('new'), true], [page('next'), false]])
  })

  it('lets an apuntes-changed reset supersede in-flight pagination and repeated reloads', async () => {
    const { loader, requests, onSuccess, onError } = setup()
    const pagination = loader.load('/api/apuntes?cursor=next', false)
    const reload = loader.load('/api/apuntes', true)
    const latestReload = loader.load('/api/apuntes', true)
    requests[0].response.reject(new Error('obsolete network failure'))
    requests[1].response.reject(new DOMException('Aborted', 'AbortError'))
    respond(requests[2], 'latest')
    await Promise.all([pagination, reload, latestReload])
    expect(requests.slice(0, 2).every(({ signal }) => signal.aborted)).toBe(true)
    expect(onSuccess.mock.calls).toEqual([[page('latest'), true]])
    expect(onError).not.toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'] as const)('cancels on cleanup without dispatching after unmount (%s)', async (outcome) => {
    const { loader, requests, onSuccess, onError } = setup()
    const pending = loader.load('/api/apuntes', true)
    loader.cancel()
    expect(requests[0].signal.aborted).toBe(true)
    if (outcome === 'resolve') respond(requests[0], 'stale')
    else requests[0].response.reject(new DOMException('Aborted', 'AbortError'))
    await pending
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    // Effect setup after cleanup (including Strict Mode) can use the same loader.
    const fresh = loader.load('/api/apuntes', true)
    respond(requests[1], 'fresh')
    await fresh
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith(page('fresh'), true)
  })

  it('still reports current network and HTTP errors and releases the request lock', async () => {
    const { loader, requests, onSuccess, onError } = setup()
    const failure = loader.load('/api/apuntes', true)
    requests[0].response.reject(new Error('offline'))
    await failure
    const httpFailure = loader.load('/api/apuntes?categoria=new', true)
    requests[1].response.resolve({ ok: false } as Response)
    await httpFailure
    expect(onError).toHaveBeenCalledTimes(2)
    expect(onSuccess).not.toHaveBeenCalled()
  })
})


describe('controlled apuntes recovery', () => {
  it.each([true, false])('retries the exact failed URL and reset=%s only on explicit retry', async (reset) => {
    const { loader, requests, onSuccess, onError, onStart } = setup()
    const url = '/api/apuntes?subjectId=subject&categoria=latest&cursor=failed-cursor'
    const failure = loader.load(url, reset)
    requests[0].response.reject(new Error('offline'))
    await failure
    expect(onError).toHaveBeenCalledOnce()
    // Repeated/queued observer notifications must not bypass the failure latch.
    await loader.load('/api/apuntes?cursor=wrong', false)
    await loader.load('/api/apuntes?cursor=wrong', false)
    expect(requests).toHaveLength(1)
    expect(onSuccess).not.toHaveBeenCalled()
    const retry = loader.retry()
    await loader.retry()
    expect(requests).toHaveLength(2)
    expect(requests[1].url).toBe(url)
    expect(onStart.mock.calls).toEqual([[false], [true]])
    respond(requests[1], 'recovered')
    await retry
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith(page('recovered'), reset)
    await loader.retry()
    expect(requests).toHaveLength(2)
    const next = loader.load('/api/apuntes?cursor=recovered', false)
    respond(requests[2], 'next')
    await next
    expect(onSuccess).toHaveBeenLastCalledWith(page('next'), false)
  })

  it('keeps repeated retry failures paused and allows another explicit retry', async () => {
    const { loader, requests, onError } = setup()
    const failure = loader.load('/api/apuntes?cursor=next', false)
    requests[0].response.resolve({ ok: false } as Response)
    await failure
    const retry = loader.retry()
    requests[1].response.reject(new Error('still offline'))
    await retry
    await loader.load('/api/apuntes?cursor=next', false)
    expect(requests).toHaveLength(2)
    expect(onError).toHaveBeenCalledTimes(2)
    const recovered = loader.retry()
    respond(requests[2], 'recovered')
    await recovered
  })

  it('discards failed categories on cancel and ignores retry results after a newer reset', async () => {
    const { loader, requests, onSuccess, onError } = setup()
    const failure = loader.load('/api/apuntes?categoria=old', true)
    requests[0].response.reject(new Error('offline'))
    await failure
    loader.cancel()
    await loader.retry()
    expect(requests).toHaveLength(1)
    const latest = loader.load('/api/apuntes?categoria=latest', true)
    requests[1].response.reject(new Error('offline'))
    await latest
    const retry = loader.retry()
    const all = loader.load('/api/apuntes', true)
    expect(requests[2].signal.aborted).toBe(true)
    respond(requests[3], 'all')
    await all
    respond(requests[2], 'obsolete retry')
    await retry
    await loader.retry()
    expect(requests).toHaveLength(4)
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith(page('all'), true)
    expect(onError).toHaveBeenCalledTimes(2)
  })
})
