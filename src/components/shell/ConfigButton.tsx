import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfigButtonProps {
  iconOnly?: boolean
  className?: string
}

export function ConfigButton({ iconOnly = false, className }: ConfigButtonProps) {
  if (iconOnly) {
    return (
      <Link
        href="/configurar"
        aria-label="Configurar"
        prefetch={false}
        className={cn(
          'inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-transparent text-white/70 transition-colors hover:bg-white/5 hover:text-white',
          className,
        )}
      >
        <SlidersHorizontal className="size-4" />
      </Link>
    )
  }

  return (
    <Link
      href="/configurar"
      prefetch={false}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white',
        className,
      )}
    >
      <SlidersHorizontal className="size-4" />
      Configurar
    </Link>
  )
}
