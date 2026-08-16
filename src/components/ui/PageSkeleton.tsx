// Skeleton genérico para los loading.tsx por segmento. Pinta el shell
// (header + sidebar + área principal) y unas barras pulsantes para evitar
// el típico parpadeo entre páginas en navegaciones.

const SIDEBAR_SLOTS = ['sb-1', 'sb-2', 'sb-3', 'sb-4', 'sb-5']
const CONTENT_SLOTS = ['ct-1', 'ct-2', 'ct-3', 'ct-4', 'ct-5', 'ct-6']

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <header className="sticky top-0 z-40 h-[calc(4rem+var(--spacing-safe-top))] pt-safe-top border-b border-white/5 bg-surface-1">
        <div className="flex h-full items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded bg-white/5" />
            <span className="h-3 w-40 animate-pulse rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-3">
            <span className="h-9 w-24 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-4rem-var(--spacing-safe-top))]">
        <aside className="w-72 shrink-0 border-r border-white/5 bg-surface-2">
          <div className="space-y-3 p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-6 w-44 animate-pulse rounded bg-white/10" />
            <div className="mt-6 space-y-2">
              {SIDEBAR_SLOTS.map((slotId) => (
                <div key={slotId} className="h-9 w-full animate-pulse rounded bg-white/5" />
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 space-y-6 bg-surface-0 p-8">
          <div className="h-10 w-72 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-96 animate-pulse rounded bg-white/5" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CONTENT_SLOTS.map((slotId) => (
              <div key={slotId} className="h-44 animate-pulse rounded bg-surface-1" />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
