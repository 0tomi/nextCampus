'use client'

import { useState, useEffect, useRef } from 'react'
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
import { ExternalLink, FileText, ImageIcon, PlayCircle, Maximize2, Minimize2 } from 'lucide-react'

function driveEmbedClassName(kind: DriveKind, variant: 'card' | 'wide'): string {
  const rounded = variant === 'wide' ? 'rounded-xl' : 'rounded-md'
  const border = variant === 'wide' ? 'border border-white/5' : 'border border-white/10'
  const base = `w-full ${rounded} ${border}`
  
  switch (kind) {
    case 'document':
      return `${base} ${variant === 'wide' ? 'h-[70vh] min-h-[500px] sm:min-h-[750px]' : 'h-[35vh] min-h-[250px] sm:min-h-[375px]'}`
    case 'spreadsheet':
      return `${base} aspect-video ${variant === 'wide' ? 'h-[55vh] min-h-[400px] sm:min-h-[600px]' : 'h-[27vh] min-h-[200px] sm:min-h-[300px]'}`
    case 'presentation':
    case 'file':
      return `${base} ${variant === 'wide' ? 'h-[65vh] min-h-[450px] sm:min-h-[650px]' : 'h-[32vh] min-h-[225px] sm:min-h-[325px]'}`
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
  variant?: 'card' | 'wide'
  apunteHref?: string
}

export function ApunteRecursoView({ recurso, variant = 'card', apunteHref }: ApunteRecursoViewProps) {
  const titulo = recurso.nombre?.trim()
    ? recurso.nombre
    : nombreFallbackRecurso(recurso.tipo)

  const linkLabel =
    recurso.tipo === 'YOUTUBE'
      ? 'Abrir en YouTube'
      : recurso.tipo === 'DRIVE'
        ? 'Abrir en Drive'
        : 'Abrir apunte'

  if (variant === 'wide') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)] shrink-0" />
            <h3 className="font-display text-sm font-bold tracking-tight text-white/90 sm:text-base">
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

        <ApunteRecursoMedia recurso={recurso} titulo={titulo} variant={variant} apunteHref={apunteHref} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-white">{titulo}</p>
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

      <ApunteRecursoMedia recurso={recurso} titulo={titulo} variant={variant} apunteHref={apunteHref} />
    </div>
  )
}

function ApunteRecursoMedia({
  recurso,
  titulo,
  variant,
  apunteHref,
}: {
  recurso: ApunteRecursoViewProps['recurso']
  titulo: string
  variant: NonNullable<ApunteRecursoViewProps['variant']>
  apunteHref?: string
}) {
  if (recurso.tipo === 'HTML') {
    if (variant === 'wide') {
      return <HtmlPreviewIframe recursoId={recurso.id} titulo={titulo} />
    }

    return <HtmlPreviewCard href={apunteHref} title={titulo} recursoId={recurso.id} />
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
        className="aspect-video w-full rounded-md border border-white/10 bg-black/20"
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
}: {
  href?: string
  title: string
  recursoId: string
}) {
  return <HtmlPreviewIframe recursoId={recursoId} titulo={title} compact />
}

function HtmlPreviewIframe({
  recursoId,
  titulo,
  compact = false,
}: {
  recursoId: string
  titulo: string
  compact?: boolean
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

  const handleReduce = () => {
    setAnimate(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsExpanded(false)
    }, 300)
  }

  useEffect(() => {
    if (!isExpanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleReduce()
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
      const timer = timerRef.current
      if (timer) clearTimeout(timer)
    }
  }, [])

  const collapsedClassName = compact
    ? 'relative h-[360px] min-h-[360px] w-full overflow-hidden rounded-xl border border-white/5 bg-surface-1 transition-all duration-300 sm:h-[420px]'
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
          <button
            type="button"
            onClick={handleReduce}
            className="absolute top-3.5 right-3.5 z-30 cursor-pointer inline-flex items-center justify-center h-[34px] px-2.5 hover:px-3 gap-0 hover:gap-1.5 rounded-lg border border-white/10 bg-black/60 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 group select-none"
            title="Reducir apunte"
          >
            <Minimize2 className="size-4 shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:max-w-[80px] group-hover:opacity-100">
              Reducir
            </span>
          </button>
        )}

        {!isExpanded && !isLoading && (
          <button
            type="button"
            onClick={handleExpand}
            className="absolute top-3.5 right-3.5 z-10 cursor-pointer inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 hover:text-white"
            title="Expandir apunte"
          >
            <Maximize2 className="size-3.5" />
            <span>Expandir</span>
          </button>
        )}

        <div className="size-full">
          <iframe
            src={`/api/apuntes/recursos/${recursoId}/preview`}
            className={`size-full rounded-xl bg-black/20 transition-opacity duration-300 ${
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
  variant: 'card' | 'wide'
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
      className={`group relative block aspect-video overflow-hidden ${rounded} border ${border} bg-white/[0.03] cursor-pointer`}
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
  variant?: 'card' | 'wide'
}) {
  const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(title)
  const Icon = isVideo ? PlayCircle : FileText

  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
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
