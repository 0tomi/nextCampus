import Image from 'next/image'
import Link from 'next/link'

export function CampusHeaderBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-9 w-9 items-center justify-center">
        <Image src="/mascot-mark.svg" alt="" aria-hidden width={36} height={36} className="h-9 w-9" />
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
