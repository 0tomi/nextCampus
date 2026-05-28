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
import { ExternalLink, FileCode2, FileText, ImageIcon, PlayCircle, X } from 'lucide-react'

function driveEmbedClassName(kind: DriveKind): string {
  const base = 'w-full rounded-md border border-white/10'
  switch (kind) {
    case 'document':
      return `${base} min-h-[600px]`
    case 'spreadsheet':
      return `${base} aspect-video min-h-[420px]`
    case 'presentation':
    case 'file':
      return `${base} aspect-video`
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
        />
      )
    }

    if (previewMode === 'fallback') {
      return <DriveFallback href={recurso.url} title={titulo} />
    }

    return (
      <iframe
        src={driveEmbedUrl(parsed)}
        className={`${driveEmbedClassName(parsed.kind)} bg-black/20`}
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
    <DriveFallback href={recurso.url} title={titulo} />
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

  const handleOpen = () => {
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
            className={`relative w-[85vw] h-[80vh] max-w-6xl rounded-2xl border border-white/10 bg-surface-1 shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-all duration-300 ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-base font-black tracking-tight text-white">
                {title}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar"
                className="inline-flex h-8 w-8 items-center justify-center rounded text-white/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 w-full p-6">
              <iframe
                src={`/api/apuntes/recursos/${recursoId}/preview`}
                className="h-full w-full rounded-md border border-white/10 bg-black/20"
                loading="lazy"
                sandbox=""
                title={title}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function HtmlPreviewIframe({ recursoId, titulo }: { recursoId: string; titulo: string }) {
  return (
    <iframe
      src={`/api/apuntes/recursos/${recursoId}/preview`}
      className="min-h-[640px] w-full rounded-md border border-white/10 bg-black/20"
      loading="lazy"
      sandbox=""
      title={titulo}
    />
  )
}

function DriveThumbnailPreview({
  href,
  src,
  title,
}: {
  href: string
  src: string
  title: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <DriveFallback href={href} title={title} />
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group relative block aspect-video overflow-hidden rounded-md border border-white/10 bg-white/[0.03] cursor-pointer"
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

function DriveFallback({ href, title }: { href: string; title: string }) {
  const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(title)
  const Icon = isVideo ? PlayCircle : FileText

  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/60">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            Este archivo se ve mejor directamente en Drive.
          </p>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        Abrir archivo
      </a>
    </div>
  )
}
