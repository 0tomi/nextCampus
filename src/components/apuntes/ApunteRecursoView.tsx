'use client'

import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import Image from 'next/image'
import {
  driveEmbedUrl,
  driveThumbnailUrl,
  extraerDriveFileId,
  extraerYoutubeId,
  inferDrivePreviewMode,
  nombreFallbackRecurso,
  youtubeEmbedUrl,
  type DriveKind,
  type RecursoTipo,
} from '@/lib/recursos'
import { ExternalLink, FileText, ImageIcon, PlayCircle, Maximize2, Minimize2, Globe, Download } from 'lucide-react'

function Github({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

type RecursoViewVariant = 'card' | 'wide' | 'content-card'

function driveEmbedClassName(kind: DriveKind, variant: RecursoViewVariant): string {
  const rounded = variant === 'wide' ? 'rounded-xl' : 'rounded-md'
  const border = variant === 'wide' ? 'border border-white/5' : 'border border-white/10'
  const base = `w-full ${rounded} ${border}`

  if (variant === 'content-card') {
    return `${base} h-full min-h-0`
  }
  
  switch (kind) {
    case 'document':
      return `${base} ${variant === 'wide' ? 'h-[70vh] min-h-[500px] sm:min-h-[750px]' : 'h-[28vh] min-h-[200px] sm:min-h-[300px]'}`
    case 'spreadsheet':
      return `${base} aspect-video ${variant === 'wide' ? 'h-[55vh] min-h-[400px] sm:min-h-[600px]' : 'h-[22vh] min-h-[180px] sm:min-h-[260px]'}`
    case 'presentation':
    case 'file':
      return `${base} ${variant === 'wide' ? 'h-[65vh] min-h-[450px] sm:min-h-[650px]' : 'h-[25vh] min-h-[180px] sm:min-h-[260px]'}`
  }
}

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

function ApunteRecursoMedia({
  recurso,
  titulo,
  variant,
  apunteHref,
  htmlLoadMode,
}: {
  recurso: ApunteRecursoViewProps['recurso']
  titulo: string
  variant: NonNullable<ApunteRecursoViewProps['variant']>
  apunteHref?: string
  htmlLoadMode: NonNullable<ApunteRecursoViewProps['htmlLoadMode']>
}) {
  if (recurso.tipo === 'REPOSITORY') {
    return <GithubRepositoryPreview href={recurso.url} title={titulo} variant={variant} />
  }

  if (recurso.tipo === 'OTHER') {
    return <LinkPreview href={recurso.url} title={titulo} variant={variant} />
  }

  if (recurso.tipo === 'HTML') {
    if (variant === 'wide') {
      return <HtmlPreviewIframe recursoId={recurso.id} titulo={titulo} />
    }

    return <HtmlPreviewCard href={apunteHref} title={titulo} recursoId={recurso.id} loadMode={htmlLoadMode} variant={variant} />
  }

  if (recurso.tipo === 'YOUTUBE') {
    const id = extraerYoutubeId(recurso.url)
    if (!id) return null
    // Embed cross-origin (youtube-nocookie.com): allow-same-origin es seguro acá
    // —la Same-Origin Policy impide que el player toque el DOM de la página— y el
    // reproductor lo necesita para acceder a su propio storage.
    return (
      <iframe
        src={youtubeEmbedUrl(id)}
        className={variant === 'content-card'
          ? 'size-full rounded-md border border-white/10 bg-black/20'
          : 'aspect-video w-full rounded-md border border-white/10 bg-black/20'}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-presentation allow-popups allow-same-origin"
        allowFullScreen
        title={titulo}
      />
    )
  }

  // DRIVE
  const parsed = extraerDriveFileId(recurso.url)
  if (parsed) {
    const previewMode = inferDrivePreviewMode(parsed, titulo)

    if (previewMode === 'thumbnail') {
      return (
        <DriveThumbnailPreview
          href={recurso.url}
          src={driveThumbnailUrl(parsed, variant === 'wide' ? 1600 : 1000)}
          title={titulo}
          variant={variant}
        />
      )
    }

    if (previewMode === 'fallback') {
      return <DriveFallback href={recurso.url} title={titulo} variant={variant} />
    }

    return (
      <iframe
        src={driveEmbedUrl(parsed)}
        className={`${driveEmbedClassName(parsed.kind, variant)} bg-black/20`}
        loading="lazy"
        allow="autoplay"
        sandbox="allow-scripts allow-forms allow-popups allow-downloads"
        allowFullScreen
        title={titulo}
      />
    )
  }

  // Fallback: URL de Drive no parseable → mensaje sutil (el link ya está en el header).
  return (
    <DriveFallback href={recurso.url} title={titulo} variant={variant} />
  )
}

function HtmlPreviewCard({
  title,
  recursoId,
  loadMode,
  variant,
}: {
  href?: string
  title: string
  recursoId: string
  loadMode: 'auto' | 'on-click'
  variant: RecursoViewVariant
}) {
  const [shouldLoad, setShouldLoad] = useState(loadMode === 'auto')

  if (!shouldLoad) {
    return <HtmlPreviewPlaceholder title={title} onLoad={() => setShouldLoad(true)} variant={variant} />
  }

  return <HtmlPreviewIframe recursoId={recursoId} titulo={title} compact tile={variant === 'content-card'} />
}

function HtmlPreviewPlaceholder({
  title,
  onLoad,
  variant,
}: {
  title: string
  onLoad: () => void
  variant: RecursoViewVariant
}) {
  return (
    <div className={[
      'relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-cyan-300/10 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.12),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-5 text-center',
      variant === 'content-card' ? 'h-full min-h-0' : 'h-[280px] min-h-[280px] sm:h-[320px]',
    ].join(' ')}>
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" />
      <FileText className="size-8 text-cyan-100/70" aria-hidden="true" />
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
        Apunte interactivo
      </p>
      <h4 className="mt-2 max-w-sm break-words text-base font-black leading-tight text-white">
        {title}
      </h4>
      <p className="mt-3 max-w-xs text-sm leading-6 text-white/52">
        Tocá para abrir la vista previa.
      </p>
      <button
        type="button"
        onClick={onLoad}
        className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-50 transition-colors hover:bg-cyan-300/15 hover:text-white"
      >
        <PlayCircle className="size-4" aria-hidden="true" />
        Ver apunte interactivo
      </button>
    </div>
  )
}

function HtmlPreviewIframe({
  recursoId,
  titulo,
  compact = false,
  tile = false,
}: {
  recursoId: string
  titulo: string
  compact?: boolean
  tile?: boolean
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [animate, setAnimate] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleExpand = () => {
    setIsExpanded(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimate(true)
      })
    })
  }

  const handleReduce = useCallback(() => {
    setAnimate(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsExpanded(false)
    }, 300)
  }, [])

  const reduceFromEscape = useEffectEvent(() => {
    handleReduce()
  })

  const clearReduceTimer = useEffectEvent(() => {
    const timer = timerRef.current
    if (timer) clearTimeout(timer)
  })

  useEffect(() => {
    if (!isExpanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reduceFromEscape()
    }
    window.addEventListener('keydown', handleKeyDown)

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isExpanded])

  useEffect(() => {
    return () => {
      clearReduceTimer()
    }
  }, [])

  const collapsedClassName = tile
    ? 'relative size-full overflow-hidden rounded-xl border border-white/5 bg-surface-1 transition-all duration-300'
    : compact
    ? 'relative h-[280px] min-h-[280px] w-full overflow-hidden rounded-xl border border-white/5 bg-surface-1 transition-all duration-300 sm:h-[320px]'
    : 'relative w-full h-[70vh] min-h-[500px] sm:min-h-[750px] rounded-xl overflow-hidden border border-white/5 bg-surface-1 transition-all duration-300'

  return (
    <>
      {isExpanded && (
        <div
          className={`fixed inset-0 z-40 bg-black/85 backdrop-blur-sm transition-opacity duration-300 ${
            animate ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleReduce}
          role="presentation"
        />
      )}

      <div
        className={
          isExpanded
            ? `fixed inset-4 sm:inset-6 z-50 flex flex-col bg-[#101010] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.8)] rounded-2xl p-0 overflow-hidden transition-all duration-300 ${
                animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
              }`
            : collapsedClassName
        }
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/35 backdrop-blur-sm transition-opacity duration-300 z-20">
            <div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-white/55 tracking-wide">
              Cargando apunte…
            </p>
          </div>
        )}

        {isExpanded && (
          <div className="absolute top-3.5 right-3.5 z-30 flex items-center gap-2">
            <a
              href={`/api/apuntes/recursos/${recursoId}/preview?download=1`}
              download
              className="cursor-pointer inline-flex items-center justify-center h-[34px] px-2.5 hover:px-3 gap-0 hover:gap-1.5 rounded-lg border border-white/10 bg-black/60 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 group select-none opacity-80 hover:opacity-100"
              title="Descargar apunte"
            >
              <Download className="size-4 shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:max-w-[80px] group-hover:opacity-100">
                Descargar
              </span>
            </a>
            <button
              type="button"
              onClick={handleReduce}
              className="cursor-pointer inline-flex items-center justify-center h-[34px] px-2.5 hover:px-3 gap-0 hover:gap-1.5 rounded-lg border border-white/10 bg-black/60 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 group select-none opacity-80 hover:opacity-100"
              title="Reducir apunte"
            >
              <Minimize2 className="size-4 shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:max-w-[80px] group-hover:opacity-100">
                Reducir
              </span>
            </button>
          </div>
        )}

        {!isExpanded && !isLoading && (
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
            <a
              href={`/api/apuntes/recursos/${recursoId}/preview?download=1`}
              download
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 hover:text-white"
              title="Descargar apunte"
            >
              <Download className="size-3.5" />
              <span>Descargar</span>
            </a>
            <button
              type="button"
              onClick={handleExpand}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 hover:text-white"
              title="Expandir apunte"
            >
              <Maximize2 className="size-3.5" />
              <span>Expandir</span>
            </button>
          </div>
        )}

        <div className={isExpanded ? 'flex-1 min-h-0 w-full' : 'size-full'}>
          <iframe
            src={`/api/apuntes/recursos/${recursoId}/preview`}
            className={`block size-full rounded-xl bg-black/20 transition-opacity duration-300 ${
              isExpanded ? 'border-none' : 'border border-white/5'
            } ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            sandbox="allow-scripts"
            title={titulo}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </>
  )
}

function DriveThumbnailPreview({
  href,
  src,
  title,
  variant,
}: {
  href: string
  src: string
  title: string
  variant: RecursoViewVariant
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <DriveFallback href={href} title={title} variant={variant} />
  }

  const rounded = variant === 'wide' ? 'rounded-xl' : 'rounded-md'
  const border = variant === 'wide' ? 'border border-white/5' : 'border border-white/10'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`group relative block overflow-hidden ${rounded} border ${border} bg-white/[0.03] cursor-pointer ${variant === 'content-card' ? 'size-full' : 'aspect-video'}`}
    >
      <Image
        src={src}
        alt={`Vista previa de ${title}`}
        fill
        sizes="(min-width: 1024px) 768px, 100vw"
        className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        unoptimized
      />
      <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
        <ImageIcon className="size-3.5" />
        Abrir archivo
      </span>
    </a>
  )
}

function DriveFallback({
  href,
  title,
  variant = 'card',
}: {
  href: string
  title: string
  variant?: RecursoViewVariant
}) {
  const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(title)
  const Icon = isVideo ? PlayCircle : FileText

  return (
    <div className={`flex flex-col items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between ${variant === 'content-card' ? 'h-full' : ''}`}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.04] text-white/70 shadow-sm">
          <Icon className="size-5.5" />
        </span>
        <div className="min-w-0">
          {variant !== 'wide' && (
            <p className="text-sm font-bold text-white tracking-tight">{title}</p>
          )}
          <p className="text-xs leading-relaxed text-white/45">
            Este archivo no tiene vista previa disponible y se ve mejor directamente en Google Drive.
          </p>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        Abrir en Drive
        <ExternalLink className="size-3" />
      </a>
    </div>
  )
}

function GithubRepositoryPreview({
  href,
  title,
  variant = 'card',
}: {
  href: string
  title: string
  variant?: RecursoViewVariant
}) {
  return (
    <div className={`flex flex-col items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04] hover:border-white/10 group sm:flex-row sm:items-center sm:justify-between ${variant === 'content-card' ? 'h-full' : ''}`}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.04] text-white/70 shadow-sm transition-colors group-hover:text-white group-hover:bg-white/[0.06]">
          <Github className="size-5.5" />
        </span>
        <div className="min-w-0">
          {variant !== 'wide' && (
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

function LinkPreview({
  href,
  title,
  variant = 'card',
}: {
  href: string
  title: string
  variant?: RecursoViewVariant
}) {
  const [data, setData] = useState<{ title: string; description: string; image?: string; logo?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((json) => {
        if (active) {
          setData(json)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [href])

  if (loading) {
    return (
      <div className={`flex animate-pulse flex-col items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between ${variant === 'content-card' ? 'h-full' : ''}`}>
        <div className="flex w-full items-center gap-3.5">
          <div className="size-11 shrink-0 rounded-lg bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-white/[0.06]" />
            <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
          </div>
        </div>
      </div>
    )
  }

  const previewTitle = data?.title || title || new URL(href).hostname
  const previewDesc = data?.description || 'Enlace a recurso externo.'
  const logoSrc = data?.logo
  const imageSrc = data?.image

  if (variant === 'content-card') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="group flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt="Site logo"
                width={16}
                height={16}
                className="size-4 rounded-sm object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none'
                }}
                unoptimized
              />
            ) : (
              <Globe className="size-3.5 text-white/30" />
            )}
            <span className="truncate">{new URL(href).hostname}</span>
          </div>
          <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-cyan-200">
            {previewTitle}
          </h4>
          <p className="line-clamp-4 text-xs leading-relaxed text-white/55">
            {previewDesc}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">
          <span>Visitar sitio</span>
          <ExternalLink className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group block overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row">
        {imageSrc && (
          <div className="relative h-40 w-full shrink-0 overflow-hidden bg-black/10 sm:h-auto sm:w-48">
            <Image
              src={imageSrc}
              alt={previewTitle}
              fill
              sizes="(min-width: 640px) 192px, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              unoptimized
            />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-between p-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
              {logoSrc ? (
                <Image
                  src={logoSrc}
                  alt="Site logo"
                  width={16}
                  height={16}
                  unoptimized
                  className="size-4 rounded-sm object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <Globe className="size-3.5 text-white/30" />
              )}
              <span className="truncate max-w-[200px]">{new URL(href).hostname}</span>
            </div>
            <div>
              <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-cyan-200 transition-colors">
                {previewTitle}
              </h4>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/55">
                {previewDesc}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">
            <span>Visitar sitio</span>
            <ExternalLink className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </a>
  )
}
