import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { renderAuditEntry, timeAgo } from '@/lib/audit-renderer'
import type { AuditDetail } from '@/lib/audit'

export interface HistorialEntry {
  id: string
  action: string
  detail: AuditDetail | null
  createdAt: Date
  userEmail: string | null
}

interface HistorialListProps {
  entries: HistorialEntry[]
  page: number
  totalPages: number
  totalCount: number
}

const ABSOLUTE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function HistorialList({ entries, page, totalPages, totalCount }: HistorialListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-surface-1 px-6 py-16 text-center">
        <p className="text-sm font-semibold text-white/70">Todavía no hay actividad para mostrar.</p>
        <p className="mt-2 text-xs text-white/45">
          Cada cambio que hagas en el panel va a aparecer acá.
        </p>
      </div>
    )
  }

  const prevHref = page > 1 ? buildPageHref(page - 1) : null
  const nextHref = page < totalPages ? buildPageHref(page + 1) : null

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {entries.map((entry) => {
          const rendered = renderAuditEntry(entry.action, entry.detail)
          const Icon = rendered.icon
          const absolute = ABSOLUTE_FORMATTER.format(entry.createdAt)
          const relative = timeAgo(entry.createdAt)
          return (
            <li
              key={entry.id}
              className="flex gap-4 rounded-lg border border-white/5 bg-surface-1 px-4 py-4 transition-colors hover:border-white/10"
            >
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${rendered.iconClassName}`}
              >
                <Icon className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-white/80">{rendered.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  <time dateTime={entry.createdAt.toISOString()} title={absolute}>
                    {relative}
                  </time>
                  {entry.userEmail ? (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="normal-case tracking-normal text-white/55">{entry.userEmail}</span>
                    </>
                  ) : null}
                  {rendered.subtitle ? (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="normal-case tracking-normal text-white/55">{rendered.subtitle}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 ? (
        <nav
          aria-label="Paginación del historial"
          className="flex items-center justify-between border-t border-white/5 pt-4 text-sm text-white/55"
        >
          <span>
            Página <span className="font-semibold text-white">{page}</span> de {totalPages}
            <span className="ml-2 text-white/40">· {totalCount} movimientos</span>
          </span>
          <div className="flex items-center gap-2">
            <PageLink href={prevHref} disabled={!prevHref}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </PageLink>
            <PageLink href={nextHref} disabled={!nextHref}>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </PageLink>
          </div>
        </nav>
      ) : null}
    </div>
  )
}

function buildPageHref(page: number): string {
  return page === 1 ? '/admin/historial' : `/admin/historial?page=${page}`
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string | null
  disabled?: boolean
  children: React.ReactNode
}) {
  const className =
    'inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white'
  if (!href || disabled) {
    return (
      <span
        aria-disabled
        className="inline-flex items-center gap-1 rounded-md border border-white/5 px-3 py-2 text-xs font-semibold text-white/30"
      >
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
