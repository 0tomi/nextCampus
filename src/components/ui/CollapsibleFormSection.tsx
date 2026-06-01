'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function CollapsibleFormSection({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string
  hint: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 py-1 text-left transition-colors"
        aria-expanded={open}
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/40 transition-colors group-hover:text-white/60">
            {title}
          </span>
          <span className="mt-1 block text-[11px] leading-4 text-white/30">{hint}</span>
        </span>
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/35 transition-colors group-hover:border-white/20 group-hover:text-white">
          <ChevronDown className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="pt-2">{children}</div>
        </div>
      </div>
    </section>
  )
}
