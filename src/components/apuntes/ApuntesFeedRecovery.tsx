'use client'

export function ApuntesFeedRecovery({
  error,
  loading,
  onRetry,
}: {
  error: string
  loading: boolean
  onRetry: () => void
}) {
  if (!error) return null

  return (
    <div className="space-y-2 py-3 text-center">
      <p role="status" className="text-xs font-semibold text-rose-300">
        {loading ? 'Reintentando cargar los apuntes…' : error}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={loading}
        aria-busy={loading}
        className="min-h-11 cursor-pointer rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? 'Reintentando…' : 'Reintentar'}
      </button>
    </div>
  )
}
