import Link from 'next/link'
import { ArrowLeft, Bell } from 'lucide-react'
import { ChangelogPageClient } from './ChangelogPageClient'
import { getAdminUser } from '@/lib/auth'
import { getVisibleChangelogEntriesPage } from '@/lib/changelog'
import { DarkCard } from '@/components/ui/DarkCard'

export default async function AdminChangelogPage() {
  const admin = await getAdminUser()
  const page = await getVisibleChangelogEntriesPage(admin)

  if (!admin) {
    return (
      <main className="min-h-screen bg-surface-0 px-5 py-8 text-white sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Volver al campus
          </Link>
          <ChangelogHero isAdmin={false} />
          <ChangelogPageClient entries={page.entries} nextCursor={page.nextCursor} />
        </div>
      </main>
    )
  }

  return (
    <div className="space-y-8">
      <ChangelogHero isAdmin />
      <ChangelogPageClient entries={page.entries} nextCursor={page.nextCursor} />
    </div>
  )
}

function ChangelogHero({ isAdmin }: { isAdmin: boolean }) {
  return (
    <DarkCard className="p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            Novedades
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Cambios del campus
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Un resumen de mejoras, ajustes y nuevas herramientas disponibles.
          </p>
          {isAdmin ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">
              Las novedades se ordenan por la actualización más reciente.
            </p>
          ) : null}
        </div>
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-none border border-amber-400/20 bg-amber-400/10 text-amber-200">
          <Bell className="size-5" />
        </span>
      </div>
    </DarkCard>
  )
}
