import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MobileTopbar } from './MobileTopbar'

export interface MobileShellDrawerYear {
  slug: string
  nombre: string
  subjectsCount: number
}

interface MobileShellProps {
  title?: string
  subtitle?: string
  onBack?: boolean
  drawerYears: MobileShellDrawerYear[]
  careerName: string
  currentYearSlug?: string
  children: ReactNode
  mainClassName?: string
}

export function MobileShell({
  title,
  subtitle,
  onBack,
  drawerYears,
  careerName,
  currentYearSlug,
  children,
  mainClassName,
}: MobileShellProps) {
  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <MobileTopbar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        drawerYears={drawerYears}
        careerName={careerName}
        currentYearSlug={currentYearSlug}
      />
      <main className={cn('pt-14 pb-12', mainClassName)}>{children}</main>
    </div>
  )
}
