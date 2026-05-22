import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

export function CampusHeaderBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.2)]">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight text-white">
          Campus Virtual
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
          FCYT - UADER
        </span>
      </div>
    </Link>
  )
}
