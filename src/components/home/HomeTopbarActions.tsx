import Link from 'next/link'
import { Shield } from 'lucide-react'
import { ConfigButton } from '@/components/shell/ConfigButton'
import { InstallPWATopbarButton } from '@/components/pwa/InstallPWA'

export function HomeTopbarActions() {
  return (
    <div className="flex items-center gap-2">
      <InstallPWATopbarButton />
      <ConfigButton />
      <Link
        href="/admin"
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Shield className="size-4" />
        Admin
      </Link>
    </div>
  )
}
