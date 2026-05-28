'use client'

import { useState, useEffect } from 'react'
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
import { ExternalLink, FileCode2, FileText, ImageIcon, PlayCircle, X, Maximize2, Minimize2 } from 'lucide-react'

function driveEmbedClassName(kind: DriveKind, variant: 'card' | 'wide'): string {
  const rounded = variant === 'wide' ? 'rounded-xl' : 'rounded-md'
  const border = variant === 'wide' ? 'border border-white/5' : 'border border-white/10'
  const base = `w-full ${rounded} ${border}`
  
  switch (kind) {
    case 'document':
      return `${base} h-[70vh] min-h-[500px] sm:min-h-[750px]`
    case 'spreadsheet':
      return `${base} aspect-video h-[55vh] min-h-[400px] sm:min-h-[600px]`
    case 'presentation':
    case 'file':
      return `${base} h-[65vh] min-h-[450px] sm:min-h-[650px]`
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
            <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)] shrink-0" />
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
  href,
  title,
  recursoId,
}: {
  href?: string
  title: string
  recursoId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  const handleOpen = () => {
    setIsLoading(true)
    setIsMaximized(false)
    
    // Inicializamos al 94vw y 90vh
    const initialWidth = Math.round(window.innerWidth * 0.94)
    const initialHeight = Math.round(window.innerHeight * 0.90)
    setWidth(initialWidth)
    setHeight(initialHeight)

    setIsOpen(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimate(true)
      })
    })
  }

  const handleClose = () => {
    setAnimate(false)
    setTimeout(() => {
      setIsOpen(false)
    }, 300)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!href) return
    if (window.matchMedia('(min-width: 1024px)').matches) {
      e.preventDefault()
      handleOpen()
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    const startWidth = width
    const startHeight = height
    const startX = e.clientX
    const startY = e.clientY

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      const minWidth = 500
      const minHeight = 400
      const maxWidth = window.innerWidth * 0.98
      const maxHeight = window.innerHeight * 0.98

      setWidth(Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX)))
      setHeight(Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  const content = (
    <div className="rounded-md border border-cyan-300/15 bg-[radial-gradient(circle_at_18%_24%,rgba(34,211,238,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <FileCode2 className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-white">Vista interactiva</p>
          <p className="mt-1 text-xs leading-5 text-white/50">
            Abrí el apunte completo para ver {title}.
          </p>
        </div>
      </div>
      <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-cyan-100/80">
        Abrir apunte completo
        <ExternalLink className="size-3.5" />
      </span>
    </div>
  )

  return (
    <>
      {href ? (
        <a
          href={href}
          onClick={handleClick}
          className="block cursor-pointer transition-opacity hover:opacity-90"
        >
          {content}
        </a>
      ) : (
        content
      )}

      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
            animate ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose}
          role="presentation"
        >
          <div
            className={`relative rounded-2xl border border-white/10 bg-surface-1 shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-all duration-300 ${
              isMaximized
                ? 'w-[98vw] h-[95vh]'
                : 'w-[94vw] h-[90vh]'
            } ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
            }`}
            style={!isMaximized && width > 0 && height > 0 ? { width: `${width}px`, height: `${height}px` } : undefined}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 select-none">
              <h2 className="text-base font-black tracking-tight text-white truncate pr-4">
                {title}
              </h2>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  aria-label={isMaximized ? "Restaurar" : "Maximizar"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded text-white/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Cerrar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded text-white/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative flex-1 w-full p-6">
              {isResizing && (
                <div className="absolute inset-0 z-40 bg-transparent cursor-se-resize" />
              )}
              {isLoading && (
                <div className="absolute inset-6 flex flex-col items-center justify-center rounded-md border border-white/5 bg-black/35 backdrop-blur-sm transition-opacity duration-300">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                  <p className="mt-3 text-xs font-semibold text-white/50 tracking-wide">
                    Cargando apunte...
                  </p>
                </div>
              )}
              <iframe
                src={`/api/apuntes/recursos/${recursoId}/preview`}
                className={`h-full w-full rounded-md border border-white/10 bg-black/20 transition-opacity duration-300 ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                }`}
                loading="lazy"
                sandbox=""
                title={title}
                onLoad={() => setIsLoading(false)}
              />
            </div>

            {/* Resizer Handle */}
            {!isMaximized && (
              <div
                className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize flex items-end justify-end p-0.5 z-45 group select-none"
                onMouseDown={handleResizeMouseDown}
              >
                <svg
                  className="size-3 text-white/20 group-hover:text-white/50 transition-colors"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M20 6L6 20M20 12L12 20M20 18L18 20" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function HtmlPreviewIframe({ recursoId, titulo }: { recursoId: string; titulo: string }) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] sm:min-h-[750px]">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-white/5 bg-black/35 backdrop-blur-sm transition-opacity duration-300">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-white/50 tracking-wide">
            Cargando apunte...
          </p>
        </div>
      )}
      <iframe
        src={`/api/apuntes/recursos/${recursoId}/preview`}
        className={`h-full w-full rounded-xl border border-white/5 bg-black/20 transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        loading="lazy"
        sandbox=""
        title={titulo}
        onLoad={() => setIsLoading(false)}
      />
    </div>
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
