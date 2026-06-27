import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAdminUser } from '@/lib/auth'
import { getVisibleChangelogEntryByChangelogId } from '@/lib/changelog'
import { ChangelogFeed } from '@/components/changelog/ChangelogFeed'

export default async function ChangelogEntryPage({ params }: { params: Promise<{ changelogId: string }> }) {
  const [{ changelogId }, admin] = await Promise.all([params, getAdminUser()])
  const entry = await getVisibleChangelogEntryByChangelogId(admin, changelogId)

  if (!entry) notFound()

  const content = (
    <div className="space-y-6">
      <Link
        href="/admin/changelog"
        className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Volver a novedades
      </Link>
      <ChangelogFeed entries={[entry]} />
    </div>
  )

  if (admin) return content

  return (
    <main className="min-h-screen bg-surface-0 px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">{content}</div>
    </main>
  )
}
