import { ExternalLink } from 'lucide-react'
import { GithubIcon } from './GithubIcon'
import { variantCardClasses } from './variantStyles'
import type { RecursoViewVariant } from './types'

export function GithubResourcePreview({
  href,
  title,
  variant = 'card',
}: {
  href: string
  title: string
  variant?: RecursoViewVariant
}) {
  const { fillHeight, showTitle } = variantCardClasses(variant)

  return (
    <div className={`flex flex-col items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04] hover:border-white/10 group sm:flex-row sm:items-center sm:justify-between ${fillHeight}`}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.04] text-white/70 shadow-sm transition-colors group-hover:text-white group-hover:bg-white/[0.06]">
          <GithubIcon className="size-5.5" />
        </span>
        <div className="min-w-0">
          {showTitle && (
            <p className="text-sm font-bold text-white tracking-tight">{title}</p>
          )}
          <p className="text-xs leading-relaxed text-white/45">
            Repositorio de GitHub asociado. Podés acceder al código fuente y documentación del recurso.
          </p>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        Ver en GitHub
        <ExternalLink className="size-3" />
      </a>
    </div>
  )
}
