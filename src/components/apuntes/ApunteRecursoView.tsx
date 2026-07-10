'use client'

import { ExternalLink } from 'lucide-react'
import { nombreFallbackRecurso, type RecursoTipo } from '@/lib/recursos'
import { ApunteRecursoMedia } from './apunte-recurso/ApunteRecursoMedia'
import type { RecursoViewVariant } from './apunte-recurso/types'

interface ApunteRecursoViewProps {
  recurso: {
    id: string
    tipo: RecursoTipo
    url: string
    orden: number
    nombre?: string | null
    storageKey?: string | null
    mimeType?: string | null
    sizeBytes?: number | null
  }
  variant?: RecursoViewVariant
  apunteHref?: string
  htmlLoadMode?: 'auto' | 'on-click'
}

export function ApunteRecursoView({ recurso, variant = 'card', apunteHref, htmlLoadMode = 'auto' }: ApunteRecursoViewProps) {
  const titulo = recurso.nombre?.trim()
    ? recurso.nombre
    : nombreFallbackRecurso(recurso.tipo)

  const linkLabel =
    recurso.tipo === 'YOUTUBE'
      ? 'Abrir en YouTube'
      : recurso.tipo === 'DRIVE'
        ? 'Abrir en Drive'
        : recurso.tipo === 'REPOSITORY'
          ? 'Abrir en GitHub'
          : recurso.tipo === 'OTHER'
            ? 'Visitar enlace'
            : 'Abrir apunte'

  if (variant === 'wide') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
            <h3 className="min-w-0 break-words font-display text-sm font-bold tracking-tight text-white/90 sm:text-base">
              {titulo}
            </h3>
          </div>
          {recurso.tipo === 'HTML' ? (
            apunteHref ? (
              <a
                href={apunteHref}
                className="shrink-0 text-xs font-semibold text-white/40 transition-colors hover:text-white/80 cursor-pointer inline-flex items-center gap-1"
              >
                {linkLabel}
                <ExternalLink className="size-3" />
              </a>
            ) : null
          ) : (
            <a
              href={recurso.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="shrink-0 text-xs font-semibold text-white/40 transition-colors hover:text-white/80 cursor-pointer inline-flex items-center gap-1"
            >
              {linkLabel}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        <ApunteRecursoMedia recurso={recurso} titulo={titulo} variant={variant} apunteHref={apunteHref} htmlLoadMode={htmlLoadMode} />
      </div>
    )
  }

  if (variant === 'content-card') {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 rounded-lg border border-white/10 bg-surface-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold leading-tight text-white" title={titulo}>
            {titulo}
          </p>
          {recurso.tipo === 'HTML' ? (
            apunteHref ? (
              <a
                href={apunteHref}
                className="shrink-0 cursor-pointer text-xs font-medium text-white/60 transition-colors hover:text-white/90"
              >
                {linkLabel}
              </a>
            ) : null
          ) : (
            <a
              href={recurso.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="shrink-0 cursor-pointer text-xs font-medium text-white/60 transition-colors hover:text-white/90"
            >
              {linkLabel}
            </a>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-md">
          <ApunteRecursoMedia recurso={recurso} titulo={titulo} variant={variant} apunteHref={apunteHref} htmlLoadMode={htmlLoadMode} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm font-semibold text-white">{titulo}</p>
        {recurso.tipo === 'HTML' ? (
          apunteHref ? (
            <a
              href={apunteHref}
              className="shrink-0 text-xs font-medium text-white/60 transition-colors hover:text-white/90 cursor-pointer"
            >
              {linkLabel}
            </a>
          ) : null
        ) : (
          <a
            href={recurso.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="shrink-0 text-xs font-medium text-white/60 transition-colors hover:text-white/90 cursor-pointer"
          >
            {linkLabel}
          </a>
        )}
      </div>

      <ApunteRecursoMedia recurso={recurso} titulo={titulo} variant={variant} apunteHref={apunteHref} htmlLoadMode={htmlLoadMode} />
    </div>
  )
}
