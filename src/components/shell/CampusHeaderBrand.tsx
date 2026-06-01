import Image from 'next/image'
import Link from 'next/link'

export function CampusHeaderBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex size-10 items-center justify-center">
        <Image src="/mascot-icon.svg" alt="" aria-hidden width={40} height={40} className="size-10" />
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
