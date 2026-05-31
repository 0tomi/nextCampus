import Link from 'next/link'

export type RelatedApunteLink = {
  id: string
  titulo: string
  slug: string
  subject: {
    slug: string
    year: {
      slug: string
    }
  }
}

function apunteHref(apunte: RelatedApunteLink): string {
  return `/${apunte.subject.year.slug}/${apunte.subject.slug}/apuntes/${apunte.slug}`
}

export function RelatedApunteLinks({
  apuntes,
  limit = 2,
  className = '',
}: {
  apuntes?: readonly RelatedApunteLink[] | null
  limit?: number
  className?: string
}) {
  if (!apuntes || apuntes.length === 0) return null

  const visible = apuntes.slice(0, limit)
  const hiddenCount = Math.max(0, apuntes.length - visible.length)

  return (
    <div className={['flex flex-wrap items-center gap-1.5', className].filter(Boolean).join(' ')}>
      {visible.map((apunte) => (
        <Link
          key={apunte.id}
          href={apunteHref(apunte)}
          className="relative z-20 max-w-full cursor-pointer truncate rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 text-[10px] font-bold leading-none text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-300/15 hover:text-white"
        >
          {apunte.titulo}
        </Link>
      ))}
      {hiddenCount > 0 ? (
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-bold leading-none text-white/45">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  )
}
